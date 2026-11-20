import { ValidationError } from "@aqui-suena/api/shared/domain-error";

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
export class MediaValidationError extends ValidationError {
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
  const limits = Object.hasOwn(MEDIA_LIMITS, kind)
    ? (MEDIA_LIMITS as Record<string, MediaLimits | undefined>)[kind]
    : undefined;

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
