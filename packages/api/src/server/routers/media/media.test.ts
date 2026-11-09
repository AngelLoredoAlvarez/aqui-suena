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

  it("confirm throws when object missing in storage", async () => {
    const { caller } = setup();

    await expect(
      caller.confirm({ key: "missing", kind: "avatar", contentType: "image/png", sizeBytes: 512 }),
    ).rejects.toThrow();
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
});
