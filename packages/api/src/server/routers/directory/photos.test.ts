import type { Business } from "@aqui-suena/api/domain/directory/business";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { InMemoryPhotoRepository, type Photo } from "@aqui-suena/api/domain/directory/photo";
import { createPhotosRouter } from "@aqui-suena/api/server/routers/directory/photos";
import { describe, expect, it } from "vitest";

const sample = {
  id: "ph-1",
  businessId: "biz-1",
  workEntryId: "we-1",
  productId: "pdct-1",
  kind: "product" as const,
  url: "https://example.com/photo.jpg",
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

const business: Business = {
  id: "biz-1",
  accountId: "acc-1",
  name: "Tacos El Güero",
  category: "food",
  phone: null,
  email: null,
  address: null,
  timezone: "America/Mexico_City",
  delivery: false,
  hiddenAt: null,
  retainedUntil: null,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

function setup(photos: Photo[] = [sample], businesses: Business[] = [business]) {
  const repository = new InMemoryPhotoRepository(photos);
  const router = createPhotosRouter({
    photo: repository,
    business: new InMemoryBusinessRepository(businesses),
  });
  const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

  return { repository, caller };
}

describe("photos router", () => {
  it("lists photos from the repository scoped to a business", async () => {
    const { caller } = setup();
    const page = await caller.listByBusiness({ businessId: "biz-1" });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("ph-1");
  });

  it("pages photos by business and rejects out-of-range values", async () => {
    const { caller } = setup([
      sample,
      { ...sample, id: "ph-2", createdAt: new Date("2024-01-02T00:00:00Z") },
    ]);
    const first = await caller.listByBusiness({ businessId: "biz-1", limit: 1 });

    expect(first.items).toHaveLength(1);
    expect(first.nextOffset).toBe(1);

    await expect(caller.listByBusiness({ businessId: "biz-1", limit: 101 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("rejects listing photos of a hidden business with NOT_FOUND", async () => {
    const { caller } = setup([], [{ ...business, hiddenAt: new Date("2024-02-01T00:00:00Z") }]);

    await expect(caller.listByBusiness({ businessId: "biz-1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects getById with NOT_FOUND when nothing matches", async () => {
    const { caller } = setup([]);

    await expect(caller.getById("nonexistent")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a malformed id with BAD_REQUEST", async () => {
    const { caller } = setup();

    await expect(caller.getById(123 as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects deleting a missing photo with NOT_FOUND", async () => {
    const { caller } = setup([]);

    await expect(caller.delete("nonexistent")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates a photo with generated id", async () => {
    const { caller } = setup([]);
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
    const { caller } = setup();
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
    const { caller } = setup();
    const updated = await caller.update({ id: "ph-1", workEntryId: null, productId: null });

    expect(updated?.workEntryId).toBeNull();
    expect(updated?.productId).toBeNull();
  });

  it("rejects updating a non-existent photo with NOT_FOUND", async () => {
    const { caller } = setup([]);

    await expect(
      caller.update({ id: "nonexistent", url: "https://example.com/x.jpg" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deletes a photo and reports success", async () => {
    const { caller } = setup();

    expect(await caller.delete("ph-1")).toBe(true);
  });
});
