import { InMemoryPhotoRepository } from "@aqui-suena/api/domain/directory/photo";
import { describe, expect, it } from "vitest";
import { createPhotosRouter } from "./photos";

const sample = {
  id: "ph-1",
  businessId: "biz-1",
  workEntryId: "we-1",
  productId: "pdct-1",
  kind: "product" as const,
  url: "https://example.com/photo.jpg",
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

describe("photos router", () => {
  it("lists photos from the repository", async () => {
    const repository = new InMemoryPhotoRepository([{ ...sample }]);
    const router = createPhotosRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const photos = await caller.list();

    expect(photos).toHaveLength(1);
    expect(photos[0]?.id).toBe("ph-1");
  });

  it("returns null when getById finds nothing", async () => {
    const repository = new InMemoryPhotoRepository([]);
    const router = createPhotosRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.getById("nonexistent")).toBeNull();
  });

  it("creates a photo with generated id", async () => {
    const repository = new InMemoryPhotoRepository([]);
    const router = createPhotosRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const created = await caller.create({
      businessId: "biz-1",
      workEntryId: null,
      productId: null,
      kind: "logo",
      url: "https://example.com/logo.jpg",
    });

    expect(created.id).toBeTruthy();
    expect(created.kind).toBe("logo");
  });

  it("updates a photo and preserves unprovided fields", async () => {
    const repository = new InMemoryPhotoRepository([{ ...sample }]);
    const router = createPhotosRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const updated = await caller.update({
      id: "ph-1",
      url: "https://example.com/new.jpg",
      kind: "logo",
    });

    expect(updated?.url).toBe("https://example.com/new.jpg");
    expect(updated?.kind).toBe("logo");
    expect(updated?.workEntryId).toBe("we-1");
  });

  it("allows setting nullable FKs to null explicitly", async () => {
    const repository = new InMemoryPhotoRepository([{ ...sample }]);
    const router = createPhotosRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const updated = await caller.update({ id: "ph-1", workEntryId: null, productId: null });

    expect(updated?.workEntryId).toBeNull();
    expect(updated?.productId).toBeNull();
  });

  it("returns null when updating a non-existent photo", async () => {
    const repository = new InMemoryPhotoRepository([]);
    const router = createPhotosRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.update({ id: "nonexistent", url: "https://example.com/x.jpg" })).toBeNull();
  });

  it("deletes a photo and reports success", async () => {
    const repository = new InMemoryPhotoRepository([{ ...sample }]);
    const router = createPhotosRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.delete("ph-1")).toBe(true);
  });
});
