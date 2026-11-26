import type { MediaKind } from "@aqui-suena/api/domain/media/media-kind";

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

export interface StoredObjectContent extends ObjectMetadata {
  bytes: Uint8Array;
}

/**
 * Port for object storage (R2, MinIO, or an in-memory fake).
 * The domain and routers depend on this abstraction, never on a concrete SDK.
 */
export interface ObjectStorage {
  presignUpload(input: PresignUploadInput): Promise<PresignUploadResult>;
  signedUrl(key: string): Promise<string>;
  head(key: string): Promise<ObjectMetadata | null>;
  readObject(key: string): Promise<StoredObjectContent | null>;
  list(prefix: string): Promise<StoredObject[]>;
  delete(key: string): Promise<void>;
}
