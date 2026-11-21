import { buildMediaKey } from "@aqui-suena/api/domain/media/key";
import type {
  ObjectMetadata,
  ObjectStorage,
  PresignUploadInput,
  PresignUploadResult,
  StoredObject,
  StoredObjectContent,
} from "@aqui-suena/api/domain/media/storage";
import { validateMediaUpload } from "@aqui-suena/api/domain/media/storage";
import {
  presignR2ListUrl,
  presignR2ObjectUrl,
  type R2StorageOptions,
} from "@aqui-suena/api/infrastructure/r2/sigv4";

export interface R2ObjectStorageOptions extends R2StorageOptions {
  fetchFn?: typeof fetch;
}

function tag(body: string, name: string): string | null {
  const match = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(body);

  return match?.[1] ?? null;
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function parseListedObjects(xml: string): StoredObject[] {
  return [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].flatMap((match) => {
    const body = match[1];
    const key = body === undefined ? null : tag(body, "Key");
    const lastModified = body === undefined ? null : tag(body, "LastModified");

    if (key === null || lastModified === null) {
      return [];
    }

    return [{ key: decodeXml(key), lastModified: new Date(lastModified) }];
  });
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

  async readObject(key: string): Promise<StoredObjectContent | null> {
    const url = await presignR2ObjectUrl(this.options, "GET", key);
    const fetchFn = this.fetchFn;
    const response = await fetchFn(url, { method: "GET" });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`R2 read failed: ${response.status}`);
    }

    return {
      key,
      size: Number(response.headers.get("content-length") ?? "0"),
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
      bytes: new Uint8Array(await response.arrayBuffer()),
    };
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

  async list(prefix: string): Promise<StoredObject[]> {
    const objects: StoredObject[] = [];
    let token: string | undefined;

    do {
      const url = await presignR2ListUrl(this.options, prefix, token);
      const fetchFn = this.fetchFn;
      const response = await fetchFn(url, { method: "GET" });

      if (!response.ok) {
        throw new Error(`R2 list failed: ${response.status}`);
      }

      const xml = await response.text();

      objects.push(...parseListedObjects(xml));

      const next = tag(xml, "NextContinuationToken");

      token =
        /<IsTruncated>true<\/IsTruncated>/.test(xml) && next !== null ? decodeXml(next) : undefined;
    } while (token !== undefined);

    return objects;
  }

  async delete(key: string): Promise<void> {
    const url = await presignR2ObjectUrl(this.options, "DELETE", key);
    // Workers rejects a native fetch invoked as a method (`this.fetchFn()`).
    const fetchFn = this.fetchFn;
    const response = await fetchFn(url, { method: "DELETE" });

    if (!response.ok && response.status !== 204 && response.status !== 404) {
      throw new Error(`R2 delete failed: ${response.status}`);
    }
  }
}
