import { InMemoryMediaRepository } from "@aqui-suena/api/domain/media/media";
import { FakeObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { createMediaRouter } from "@aqui-suena/api/server/routers/media/media";
import { describe, expect, it } from "vitest";

describe("media router", () => {
  function setup() {
    const repository = new InMemoryMediaRepository([]);
    const storage = new FakeObjectStorage();
    const router = createMediaRouter(repository, storage);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    return { repository, storage, caller };
  }

  it("presigns an upload", async () => {
    const { caller, storage } = setup();

    const result = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    expect(result.key).toBeTruthy();
    expect(result.uploadUrl).toMatch(/^https:/);
    expect(storage.presigned).toHaveLength(1);
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
    expect(await repository.getById(media.id)).not.toBeNull();
  });

  it("rejects a key that belongs to another account with NOT_FOUND", async () => {
    const { caller, storage } = setup();
    const key = "avatar/acc-2/1";
    storage.confirm(key, 512, "image/png");

    await expect(
      caller.confirm({ key, kind: "avatar", contentType: "image/png", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a key that does not use the declared kind prefix with NOT_FOUND", async () => {
    const { caller, storage } = setup();
    const key = "flyer/acc-1/1";
    storage.confirm(key, 512, "image/png");

    await expect(
      caller.confirm({ key, kind: "avatar", contentType: "image/png", sizeBytes: 512 }),
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

  it("persists the real storage size and content type", async () => {
    const { caller, storage, repository } = setup();
    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });
    storage.confirm(key, 600, "image/jpeg");

    const media = await caller.confirm({
      key,
      kind: "avatar",
      contentType: "image/jpeg",
      sizeBytes: 600,
    });

    expect(media.size).toBe(600);
    expect(media.mime).toBe("image/jpeg");
    expect((await repository.getById(media.id))?.size).toBe(600);
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
        key: "avatar/acc-1/missing",
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

    const list = await caller.list();

    expect(list).toHaveLength(1);
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

    const ok = await caller.delete(media.id);

    expect(ok).toBe(true);
    expect(await storage.head(key)).toBeNull();
  });

  it("rejects deleting a malformed id with BAD_REQUEST", async () => {
    const { caller } = setup();

    await expect(caller.delete(123 as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects deleting a missing media with NOT_FOUND", async () => {
    const { caller } = setup();

    await expect(caller.delete("nonexistent")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
