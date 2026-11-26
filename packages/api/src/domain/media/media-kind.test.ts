import {
  MEDIA_LIMITS,
  MediaValidationError,
  validateMediaUpload,
} from "@aqui-suena/api/domain/media/media-kind";
import { describe, expect, it } from "vitest";

describe("validateMediaUpload", () => {
  it("accepts a valid upload within the kind limits", () => {
    expect(() => validateMediaUpload("product-photo", "image/jpeg", 1024)).not.toThrow();
  });

  it("accepts a size exactly at the kind limit", () => {
    expect(() =>
      validateMediaUpload("flyer", "image/png", MEDIA_LIMITS.flyer.maxSizeBytes),
    ).not.toThrow();
  });

  it("rejects an unknown media kind", () => {
    expect(() => validateMediaUpload("video", "video/mp4", 1024)).toThrow(MediaValidationError);
    expect(() => validateMediaUpload("toString", "image/png", 1024)).toThrow(MediaValidationError);
  });

  it("rejects an unsupported content type", () => {
    expect(() => validateMediaUpload("product-photo", "image/gif", 1024)).toThrow(
      MediaValidationError,
    );
  });

  it("rejects a negative size", () => {
    expect(() => validateMediaUpload("product-photo", "image/jpeg", -1)).toThrow(
      MediaValidationError,
    );
  });

  it("rejects a file larger than the kind limit", () => {
    expect(() =>
      validateMediaUpload(
        "product-photo",
        "image/jpeg",
        MEDIA_LIMITS["product-photo"].maxSizeBytes + 1,
      ),
    ).toThrow(MediaValidationError);
  });
});

describe("MEDIA_LIMITS", () => {
  it("defines the size and mime limits for every kind", () => {
    expect(MEDIA_LIMITS).toEqual({
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
    });
  });
});
