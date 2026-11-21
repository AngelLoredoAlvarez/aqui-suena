import { buildMediaKey } from "@aqui-suena/api/domain/media/key";
import type {
  ObjectMetadata,
  ObjectStorage,
  PresignUploadInput,
  PresignUploadResult,
} from "@aqui-suena/api/domain/media/storage";
import { validateMediaUpload } from "@aqui-suena/api/domain/media/storage";
import { presignR2ObjectUrl, type R2StorageOptions } from "@aqui-suena/api/infrastructure/r2/sigv4";

export interface R2ObjectStorageOptions extends R2StorageOptions {
  fetchFn?: typeof fetch;
}

/**
 * Media adapter for R2: owns the media key layout and the size/type rules,
 * while the SigV4 signing lives in the neutral `infrastructure/r2` context.
 */
export class R2ObjectStorage implements ObjectStorage {
  private readonly fetchFn: typeof fetch;

  constructor(private readonly options: R2ObjectStorageOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async presignUpload(input: PresignUploadInput): Promise<PresignUploadResult> {
    validateMediaUpload(input.kind, input.contentType, input.sizeBytes);

    const key = buildMediaKey({
      accountId: input.ownerId,
      businessId: input.businessId,
      kind: input.kind,
      contentType: input.contentType,
    });

    const uploadUrl = await presignR2ObjectUrl(this.options, "PUT", key);

    return { key, uploadUrl };
  }

  async signedUrl(key: string): Promise<string> {
    return presignR2ObjectUrl(this.options, "GET", key);
  }

  async head(key: string): Promise<ObjectMetadata | null> {
    const url = await presignR2ObjectUrl(this.options, "GET", key);
    // Workers rejects a native fetch invoked as a method (`this.fetchFn()`).
    const fetchFn = this.fetchFn;
    const response = await fetchFn(url, { method: "GET" });

    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`R2 head failed: ${response.status}`);
    }

    const size = Number(response.headers.get("content-length") ?? "0");
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    return { key, size, contentType };
  }

  async delete(key: string): Promise<void> {
    const url = await presignR2ObjectUrl(this.options, "DELETE", key);
    // Workers rejects a native fetch invoked as a method (`this.fetchFn()`).
    const fetchFn = this.fetchFn;
    const response = await fetchFn(url, { method: "DELETE" });

    if (!response.ok && response.status !== 204) {
      throw new Error(`R2 delete failed: ${response.status}`);
    }
  }
}
