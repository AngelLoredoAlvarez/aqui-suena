import { buildMediaKey } from "@aqui-suena/api/domain/media/key";
import { type MediaKind, validateMediaUpload } from "@aqui-suena/api/domain/media/media-kind";

export {
  MEDIA_LIMITS,
  type MediaKind,
  type MediaLimits,
  MediaValidationError,
  validateMediaUpload,
} from "@aqui-suena/api/domain/media/media-kind";

export interface PresignUploadInput {
  kind: MediaKind;
  contentType: string;
  sizeBytes: number;
  ownerId: string;
  businessId?: string;
}

export interface PresignUploadResult {
  key: string;
  uploadUrl: string;
}

export interface ObjectMetadata {
  key: string;
  size: number;
  contentType: string;
}

export interface StoredObject {
  key: string;
  lastModified: Date;
}

/**
 * Port for object storage (R2, MinIO, or an in-memory fake).
 * The domain and routers depend on this abstraction, never on a concrete SDK.
 */
export interface ObjectStorage {
  presignUpload(input: PresignUploadInput): Promise<PresignUploadResult>;
  signedUrl(key: string): Promise<string>;
  head(key: string): Promise<ObjectMetadata | null>;
  list(prefix: string): Promise<StoredObject[]>;
  delete(key: string): Promise<void>;
}

/**
 * In-memory `ObjectStorage` adapter. Used by the local Node process (which has
 * no R2 credentials) and by tests. It captures presigned requests and simulates
 * stored metadata via `confirm()`, validating input through `validateMediaUpload`.
 */
export class InMemoryObjectStorage implements ObjectStorage {
  readonly presigned: PresignUploadInput[] = [];
  private readonly stored = new Map<string, ObjectMetadata>();
  private readonly storedAt = new Map<string, Date>();

  async presignUpload(input: PresignUploadInput): Promise<PresignUploadResult> {
    validateMediaUpload(input.kind, input.contentType, input.sizeBytes);

    const key = buildMediaKey({
      accountId: input.ownerId,
      businessId: input.businessId,
      kind: input.kind,
      contentType: input.contentType,
    });

    const uploadUrl = `https://fake.r2/${key}`;

    this.presigned.push(input);

    return { key, uploadUrl };
  }

  async head(key: string): Promise<ObjectMetadata | null> {
    return this.stored.get(key) ?? null;
  }

  async signedUrl(key: string): Promise<string> {
    return `https://fake.r2/${key}?signed=1`;
  }

  async list(prefix: string): Promise<StoredObject[]> {
    return [...this.stored.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key]) => ({ key, lastModified: this.storedAt.get(key) ?? new Date(0) }));
  }

  async delete(key: string): Promise<void> {
    this.stored.delete(key);
    this.storedAt.delete(key);
  }

  /** Simulates a client that finished uploading to `key`. */
  confirm(key: string, size: number, contentType: string, storedAt: Date = new Date()): void {
    this.stored.set(key, { key, size, contentType });
    this.storedAt.set(key, storedAt);
  }
}
