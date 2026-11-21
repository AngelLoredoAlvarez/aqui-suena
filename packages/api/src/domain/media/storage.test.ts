import {
  InMemoryObjectStorage,
  MEDIA_LIMITS,
  MediaValidationError,
  validateMediaUpload,
} from "@aqui-suena/api/domain/media/storage";
import { describe, expect, it } from "vitest";

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
    expect(() => validateMediaUpload("toString", "image/png", 1024)).toThrow(MediaValidationError);
  });

  it("exposes the limits for each kind", () => {
    expect(MEDIA_LIMITS.flyer.maxSizeBytes).toBe(1 * 1024 * 1024);
    expect(MEDIA_LIMITS.avatar.maxSizeBytes).toBe(500 * 1024);
    expect(MEDIA_LIMITS["spot-audio"].allowedMimeTypes).toEqual(["audio/mpeg"]);
  });
});

describe("InMemoryObjectStorage", () => {
  it("presigns a valid upload under the v1 business prefix", async () => {
    const storage = new InMemoryObjectStorage();

    const result = await storage.presignUpload({
      kind: "product-photo",
      contentType: "image/jpeg",
      sizeBytes: 1024,
      ownerId: "acc-1",
      businessId: "biz-1",
    });

    expect(result.key).toMatch(
      /^media\/v1\/acc-1\/businesses\/biz-1\/product-photo\/[0-9a-f-]{36}\.jpg$/,
    );
    expect(result.uploadUrl).toMatch(/^https:/);
    expect(storage.presigned).toHaveLength(1);
  });

  it("presigns an account avatar under the v1 account prefix", async () => {
    const storage = new InMemoryObjectStorage();

    const result = await storage.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
      ownerId: "acc-1",
    });

    expect(result.key).toMatch(/^media\/v1\/acc-1\/account\/avatar\/[0-9a-f-]{36}\.png$/);
  });

  it("rejects a business kind without a business id before presigning", async () => {
    const storage = new InMemoryObjectStorage();

    await expect(
      storage.presignUpload({
        kind: "flyer",
        contentType: "image/jpeg",
        sizeBytes: 512,
        ownerId: "acc-1",
      }),
    ).rejects.toThrow(MediaValidationError);

    expect(storage.presigned).toHaveLength(0);
  });

  it("rejects an invalid upload before presigning", async () => {
    const storage = new InMemoryObjectStorage();

    await expect(
      storage.presignUpload({
        kind: "product-photo",
        contentType: "image/gif",
        sizeBytes: 1024,
        ownerId: "acc-1",
        businessId: "biz-1",
      }),
    ).rejects.toThrow(MediaValidationError);

    expect(storage.presigned).toHaveLength(0);
  });

  it("returns null when heading an unknown key", async () => {
    const storage = new InMemoryObjectStorage();

    expect(await storage.head("nope")).toBeNull();
  });

  it("returns metadata after confirm", async () => {
    const storage = new InMemoryObjectStorage();

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

  it("returns a signed read url for a stored key", async () => {
    const storage = new InMemoryObjectStorage();

    expect(await storage.signedUrl("media/v1/acc-1/account/avatar/key.png")).toBe(
      "https://fake.r2/media/v1/acc-1/account/avatar/key.png?signed=1",
    );
  });

  it("delete removes the object", async () => {
    const storage = new InMemoryObjectStorage();

    const { key } = await storage.presignUpload({
      kind: "flyer",
      contentType: "image/jpeg",
      sizeBytes: 512,
      ownerId: "acc-1",
      businessId: "biz-1",
    });

    storage.confirm(key, 512, "image/jpeg");

    await storage.delete(key);

    expect(await storage.head(key)).toBeNull();
  });
});
