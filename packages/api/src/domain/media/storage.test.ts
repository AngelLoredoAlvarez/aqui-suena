import { describe, expect, it } from "vitest";
import {
  FakeObjectStorage,
  MEDIA_LIMITS,
  MediaValidationError,
  validateMediaUpload,
} from "./storage";

describe("validateMediaUpload", () => {
  it("accepts a valid product photo within limits", () => {
    expect(() => validateMediaUpload("product-photo", "image/jpeg", 1024)).not.toThrow();
  });

  it("rejects an unsupported mime type", () => {
    expect(() => validateMediaUpload("product-photo", "image/gif", 1024)).toThrow(
      MediaValidationError,
    );
  });

  it("rejects a file larger than the kind limit", () => {
    expect(() => validateMediaUpload("product-photo", "image/jpeg", 3 * 1024 * 1024)).toThrow(
      MediaValidationError,
    );
  });

  it("rejects a negative size", () => {
    expect(() => validateMediaUpload("product-photo", "image/jpeg", -1)).toThrow(
      MediaValidationError,
    );
  });

  it("rejects an unknown media kind", () => {
    expect(() => validateMediaUpload("video", "video/mp4", 1024)).toThrow(MediaValidationError);
  });

  it("exposes the limits for each kind", () => {
    expect(MEDIA_LIMITS.flyer.maxSizeBytes).toBe(1 * 1024 * 1024);
    expect(MEDIA_LIMITS.avatar.maxSizeBytes).toBe(500 * 1024);
    expect(MEDIA_LIMITS["spot-audio"].allowedMimeTypes).toEqual(["audio/mpeg"]);
  });
});

describe("FakeObjectStorage", () => {
  it("presigns a valid upload and records the request", async () => {
    const storage = new FakeObjectStorage();

    const result = await storage.presignUpload({
      kind: "product-photo",
      contentType: "image/jpeg",
      sizeBytes: 1024,
      ownerId: "acc-1",
    });

    expect(result.key).toBeTruthy();
    expect(result.uploadUrl).toMatch(/^https:/);
    expect(storage.presigned).toHaveLength(1);
  });

  it("rejects an invalid upload before presigning", async () => {
    const storage = new FakeObjectStorage();

    await expect(
      storage.presignUpload({
        kind: "product-photo",
        contentType: "image/gif",
        sizeBytes: 1024,
        ownerId: "acc-1",
      }),
    ).rejects.toThrow(MediaValidationError);

    expect(storage.presigned).toHaveLength(0);
  });

  it("returns null when heading an unknown key", async () => {
    const storage = new FakeObjectStorage();

    expect(await storage.head("nope")).toBeNull();
  });

  it("returns metadata after confirm", async () => {
    const storage = new FakeObjectStorage();

    const { key } = await storage.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
      ownerId: "acc-1",
    });

    storage.confirm(key, 512, "image/png");

    const meta = await storage.head(key);

    expect(meta).toEqual({ key, size: 512, contentType: "image/png" });
  });

  it("delete removes the object", async () => {
    const storage = new FakeObjectStorage();

    const { key } = await storage.presignUpload({
      kind: "flyer",
      contentType: "image/jpeg",
      sizeBytes: 512,
      ownerId: "acc-1",
    });

    storage.confirm(key, 512, "image/jpeg");

    await storage.delete(key);

    expect(await storage.head(key)).toBeNull();
  });
});
