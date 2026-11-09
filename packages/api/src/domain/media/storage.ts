export type MediaKind = "product-photo" | "flyer" | "spot-audio" | "avatar";

export interface MediaLimits {
  maxSizeBytes: number;
  allowedMimeTypes: readonly string[];
}

/**
 * Hard limits per media kind (see SPEC-media-storage "Free-Tier Limits").
 * These are domain rules: they do not depend on R2, the network, or any SDK.
 */
export const MEDIA_LIMITS: Record<MediaKind, MediaLimits> = {
  "product-photo": {
    maxSizeBytes: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  flyer: {
    maxSizeBytes: 1 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  "spot-audio": {
    maxSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ["audio/mpeg"],
  },
  avatar: {
    maxSizeBytes: 500 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
};

/**
 * Thrown when an upload request violates the media rules.
 * Callers (tRPC router) map this to a typed error the UI can show.
 */
export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaValidationError";
  }
}

/**
 * Validates an upload request against the kind's limits BEFORE any presigned
 * URL is generated. Pure function: no I/O, no side effects, fully testable.
 */
export function validateMediaUpload(kind: string, contentType: string, sizeBytes: number): void {
  const limits = (MEDIA_LIMITS as Record<string, MediaLimits | undefined>)[kind];

  if (limits === undefined) {
    throw new MediaValidationError(`Unknown media kind: ${String(kind)}`);
  }

  if (!limits.allowedMimeTypes.includes(contentType)) {
    throw new MediaValidationError(
      `Unsupported content type '${contentType}' for ${kind}. Allowed: ${limits.allowedMimeTypes.join(", ")}`,
    );
  }

  if (sizeBytes < 0) {
    throw new MediaValidationError("File size cannot be negative");
  }

  if (sizeBytes > limits.maxSizeBytes) {
    throw new MediaValidationError(
      `File size ${sizeBytes} exceeds limit ${limits.maxSizeBytes} for ${kind}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Port: ObjectStorage
// ---------------------------------------------------------------------------

export interface PresignUploadInput {
  kind: string;
  contentType: string;
  sizeBytes: number;
  ownerId: string;
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

/**
 * Port for object storage (R2, MinIO, or an in-memory fake).
 * The domain and routers depend on this abstraction, never on a concrete SDK.
 */
export interface ObjectStorage {
  presignUpload(input: PresignUploadInput): Promise<PresignUploadResult>;
  head(key: string): Promise<ObjectMetadata | null>;
  delete(key: string): Promise<void>;
}

/**
 * In-memory test double. Captures presigned requests and simulates stored
 * metadata via `confirm()`. Validates input through `validateMediaUpload`.
 */
export class FakeObjectStorage implements ObjectStorage {
  private counter = 0;
  readonly presigned: PresignUploadInput[] = [];
  private readonly stored = new Map<string, ObjectMetadata>();

  async presignUpload(input: PresignUploadInput): Promise<PresignUploadResult> {
    validateMediaUpload(input.kind, input.contentType, input.sizeBytes);

    this.counter += 1;
    const key = `${input.kind}/${input.ownerId}/${this.counter}`;
    const uploadUrl = `https://fake.r2/${key}`;

    this.presigned.push(input);
    return { key, uploadUrl };
  }

  async head(key: string): Promise<ObjectMetadata | null> {
    return this.stored.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.stored.delete(key);
  }

  /** Test helper: simulates a client that finished uploading to `key`. */
  confirm(key: string, size: number, contentType: string): void {
    this.stored.set(key, { key, size, contentType });
  }
}
