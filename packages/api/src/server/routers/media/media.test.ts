import { InMemoryMediaRepository } from "@aqui-suena/api/domain/media/media";
import { InMemoryObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { createMediaRouter } from "@aqui-suena/api/server/routers/media/media";
import { describe, expect, it } from "vitest";

const UUID = "3c8f0a4e-1f3b-4a2c-9d5e-6b7a8c9d0e1f";

describe("media router", () => {
  function setup() {
    const repository = new InMemoryMediaRepository([]);
    const storage = new InMemoryObjectStorage();
    const router = createMediaRouter(repository, storage);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    return { repository, storage, caller };
  }

  it("presigns an account avatar under the v1 account prefix", async () => {
    const { caller, storage } = setup();

    const result = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    expect(result.key).toMatch(/^media\/v1\/acc-1\/account\/avatar\/[0-9a-f-]{36}\.png$/);
    expect(result.uploadUrl).toMatch(/^https:/);
    expect(storage.presigned).toHaveLength(1);
    expect(storage.presigned[0]?.businessId).toBeUndefined();
  });

  it("presigns business media under the v1 business prefix", async () => {
    const { caller, storage } = setup();

    const result = await caller.presignUpload({
      kind: "flyer",
      contentType: "image/jpeg",
      sizeBytes: 512,
      businessId: "biz-1",
    });

    expect(result.key).toMatch(/^media\/v1\/acc-1\/businesses\/biz-1\/flyer\/[0-9a-f-]{36}\.jpg$/);
    expect(storage.presigned[0]?.businessId).toBe("biz-1");
  });

  it("rejects business media without a business id on presign", async () => {
    const { caller } = setup();

    await expect(
      caller.presignUpload({ kind: "flyer", contentType: "image/jpeg", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a business id for an avatar on presign", async () => {
    const { caller } = setup();

    await expect(
      caller.presignUpload({
        kind: "avatar",
        contentType: "image/png",
        sizeBytes: 512,
        businessId: "biz-1",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects invalid mime on presign", async () => {
    const { caller } = setup();

    await expect(
      caller.presignUpload({ kind: "avatar", contentType: "image/gif", sizeBytes: 512 }),
    ).rejects.toThrow();
  });

  it("confirm stores metadata after head succeeds", async () => {
    const { caller, storage, repository } = setup();

    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    storage.confirm(key, 512, "image/png");

    const media = await caller.confirm({
      key,
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    expect(media.r2Key).toBe(key);
    expect(media.businessId).toBeNull();
    expect(await repository.getById(media.id)).not.toBeNull();
  });

  it("rejects a key that belongs to another account with NOT_FOUND", async () => {
    const { caller, storage } = setup();
    const key = `media/v1/acc-2/account/avatar/${UUID}.png`;
    storage.confirm(key, 512, "image/png");

    await expect(
      caller.confirm({ key, kind: "avatar", contentType: "image/png", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a key whose kind differs from the declared kind with NOT_FOUND", async () => {
    const { caller, storage } = setup();
    const key = `media/v1/acc-1/businesses/biz-1/product-photo/${UUID}.webp`;
    storage.confirm(key, 512, "image/png");

    await expect(
      caller.confirm({ key, kind: "avatar", contentType: "image/png", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a key with a prototype-chain kind segment with NOT_FOUND", async () => {
    const { caller } = setup();

    await expect(
      caller.confirm({
        key: `media/v1/acc-1/businesses/biz-1/toString/${UUID}.png`,
        kind: "avatar",
        contentType: "image/png",
        sizeBytes: 512,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a legacy flat key with NOT_FOUND", async () => {
    const { caller, storage } = setup();
    const key = `product-photo/acc-1/${UUID}`;
    storage.confirm(key, 512, "image/webp");

    await expect(
      caller.confirm({ key, kind: "product-photo", contentType: "image/webp", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a key whose extension differs from the declared content type", async () => {
    const { caller, storage } = setup();
    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });
    storage.confirm(key, 512, "image/jpeg");

    await expect(
      caller.confirm({ key, kind: "avatar", contentType: "image/jpeg", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a content type that differs from storage with BAD_REQUEST", async () => {
    const { caller, storage } = setup();
    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });
    storage.confirm(key, 512, "image/jpeg");

    await expect(
      caller.confirm({ key, kind: "avatar", contentType: "image/png", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a size that differs from storage with BAD_REQUEST", async () => {
    const { caller, storage } = setup();
    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });
    storage.confirm(key, 1024, "image/png");

    await expect(
      caller.confirm({ key, kind: "avatar", contentType: "image/png", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("persists the real storage size instead of the presigned size", async () => {
    const { caller, storage, repository } = setup();
    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });
    storage.confirm(key, 600, "image/png");

    const media = await caller.confirm({
      key,
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 600,
    });

    expect(media.size).toBe(600);
    expect(media.mime).toBe("image/png");
    expect((await repository.getById(media.id))?.size).toBe(600);
  });

  it("persists the business scope parsed from the key", async () => {
    const { caller, storage, repository } = setup();
    const { key } = await caller.presignUpload({
      kind: "flyer",
      contentType: "image/jpeg",
      sizeBytes: 512,
      businessId: "biz-1",
    });
    storage.confirm(key, 512, "image/jpeg");

    const media = await caller.confirm({
      key,
      kind: "flyer",
      contentType: "image/jpeg",
      sizeBytes: 512,
    });

    expect(media.businessId).toBe("biz-1");
    expect((await repository.getById(media.id))?.businessId).toBe("biz-1");
  });

  it("returns the existing row when the same object is confirmed twice", async () => {
    const { caller, storage, repository } = setup();
    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });
    storage.confirm(key, 512, "image/png");

    const first = await caller.confirm({
      key,
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });
    const second = await caller.confirm({
      key,
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    expect(second.id).toBe(first.id);
    expect(
      (await repository.listByOwner({ ownerId: "acc-1", limit: 20, offset: 0 })).items,
    ).toHaveLength(1);
  });

  it("rejects a real content type outside the kind limits with BAD_REQUEST", async () => {
    const { caller, storage } = setup();
    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });
    storage.confirm(key, 512, "application/pdf");

    await expect(
      caller.confirm({ key, kind: "avatar", contentType: "application/pdf", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("confirm throws NOT_FOUND when the object is missing in storage", async () => {
    const { caller } = setup();

    await expect(
      caller.confirm({
        key: `media/v1/acc-1/account/avatar/${UUID}.png`,
        kind: "avatar",
        contentType: "image/png",
        sizeBytes: 512,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("list returns owner media", async () => {
    const { caller, storage } = setup();

    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    storage.confirm(key, 512, "image/png");

    await caller.confirm({ key, kind: "avatar", contentType: "image/png", sizeBytes: 512 });

    const page = await caller.list();

    expect(page.items).toHaveLength(1);
    expect(page).toMatchObject({ limit: 20, offset: 0, nextOffset: null });
  });

  it("pages the owner's media and rejects out-of-range values", async () => {
    const { caller, repository } = setup();

    await repository.create({
      ownerId: "acc-1",
      businessId: null,
      kind: "avatar",
      r2Key: "k1",
      mime: "image/png",
      size: 1,
    });
    await repository.create({
      ownerId: "acc-1",
      businessId: null,
      kind: "avatar",
      r2Key: "k2",
      mime: "image/png",
      size: 1,
    });
    await repository.create({
      ownerId: "acc-2",
      businessId: null,
      kind: "avatar",
      r2Key: "k3",
      mime: "image/png",
      size: 1,
    });

    const page = await caller.list({ limit: 1 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.ownerId).toBe("acc-1");
    expect(page.nextOffset).toBe(1);

    await expect(caller.list({ limit: 101 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.list({ offset: -1 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("delete removes from repo and storage", async () => {
    const { caller, storage } = setup();

    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    storage.confirm(key, 512, "image/png");

    const media = await caller.confirm({
      key,
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    const ok = await caller.delete({ id: media.id });

    expect(ok).toBe(true);
    expect(await storage.head(key)).toBeNull();
  });

  it("rejects deleting a malformed id with BAD_REQUEST", async () => {
    const { caller } = setup();

    await expect(caller.delete({ id: 123 as never })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("rejects deleting a missing media with NOT_FOUND", async () => {
    const { caller } = setup();

    await expect(caller.delete({ id: "nonexistent" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("answers SERVICE_UNAVAILABLE on presign when storage is not configured", async () => {
    const router = createMediaRouter(new InMemoryMediaRepository([]), undefined);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    await expect(
      caller.presignUpload({ kind: "avatar", contentType: "image/png", sizeBytes: 512 }),
    ).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      message: "media storage is not configured",
    });
  });

  it("answers SERVICE_UNAVAILABLE on confirm when storage is not configured", async () => {
    const router = createMediaRouter(new InMemoryMediaRepository([]), undefined);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    await expect(
      caller.confirm({
        key: "avatar/acc-1/1",
        kind: "avatar",
        contentType: "image/png",
        sizeBytes: 512,
      }),
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });

  it("answers SERVICE_UNAVAILABLE on delete when storage is not configured", async () => {
    const router = createMediaRouter(new InMemoryMediaRepository([]), undefined);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    await expect(caller.delete({ id: "media-1" })).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
  });
});
