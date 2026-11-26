import type { Business } from "@aqui-suena/api/domain/directory/model/business";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/model/business";
import { InMemoryPhotoRepository, type Photo } from "@aqui-suena/api/domain/directory/model/photo";
import { InMemoryMediaRepository, type Media } from "@aqui-suena/api/domain/media/media";
import { InMemoryObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { createPhotosRouter } from "@aqui-suena/api/server/routers/directory/photos";
import { describe, expect, it } from "vitest";

const sample: Photo = {
  id: "ph-1",
  businessId: "biz-1",
  workEntryId: "we-1",
  productId: "pdct-1",
  kind: "product",
  mediaId: "med-1",
  url: null,
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

function makeMedia(id: string, kind: Media["kind"] = "product-photo"): Media {
  return {
    id,
    ownerId: "acc-1",
    businessId: "biz-1",
    kind,
    r2Key: `media/v1/acc-1/businesses/biz-1/${kind}/${id}.jpg`,
    mime: "image/jpeg",
    size: 1,
    createdAt: new Date("2024-01-01T00:00:00Z"),
  };
}

function setup(photos: Photo[] = [sample], businesses: Business[] = [business]) {
  const repository = new InMemoryPhotoRepository(photos);
  const media = new InMemoryMediaRepository([makeMedia("med-1"), makeMedia("med-2")]);
  const storage = new InMemoryObjectStorage();

  const router = createPhotosRouter({
    photo: repository,
    business: new InMemoryBusinessRepository(businesses),
    media,
    storage,
  });

  const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

  return { repository, media, storage, caller };
}

describe("photos router", () => {
  it("lists photos from the repository scoped to a business and signs their media", async () => {
    const { caller } = setup();
    const page = await caller.listByBusiness({ businessId: "biz-1" });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("ph-1");
    expect(page.items[0]?.url).toBe(
      "https://fake.r2/media/v1/acc-1/businesses/biz-1/product-photo/med-1.jpg?signed=1",
    );
  });

  it("keeps a legacy url when the photo has no media", async () => {
    const { caller } = setup([{ ...sample, mediaId: null, url: "https://example.com/legacy.jpg" }]);

    const page = await caller.listByBusiness({ businessId: "biz-1" });

    expect(page.items[0]?.url).toBe("https://example.com/legacy.jpg");
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

    await expect(caller.getById({ id: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects getById for a photo of a hidden business", async () => {
    const { caller } = setup(
      [sample],
      [{ ...business, hiddenAt: new Date("2024-02-01T00:00:00Z") }],
    );

    await expect(caller.getById({ id: "ph-1" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a malformed id with BAD_REQUEST", async () => {
    const { caller } = setup();

    await expect(caller.getById({ id: 123 as never })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("rejects deleting a missing photo with NOT_FOUND", async () => {
    const { caller } = setup([]);

    await expect(caller.delete({ id: "nonexistent" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates a photo linked to media", async () => {
    const { caller, media, storage } = setup([]);

    const created = await caller.create({
      businessId: "biz-1",
      workEntryId: null,
      productId: null,
      kind: "logo",
      mediaId: "med-1",
    });

    expect(created.id).toBeTruthy();
    expect(created.kind).toBe("logo");
    expect(created.mediaId).toBe("med-1");
    expect(created.url).toContain("med-1.jpg");
    expect(await media.getById("med-1")).not.toBeNull();
    expect(storage.presigned).toHaveLength(0);
  });

  it("rejects attaching media from another business or kind", async () => {
    const { caller, media } = setup();

    const foreign = await media.create({
      ownerId: "acc-2",
      businessId: "biz-1",
      kind: "product-photo",
      r2Key: "media/v1/acc-2/businesses/biz-1/product-photo/foreign.jpg",
      mime: "image/jpeg",
      size: 1,
    });

    const wrongKind = await media.create({
      ownerId: "acc-1",
      businessId: "biz-1",
      kind: "flyer",
      r2Key: "media/v1/acc-1/businesses/biz-1/flyer/wrong.jpg",
      mime: "image/jpeg",
      size: 1,
    });

    await expect(
      caller.create({
        businessId: "biz-1",
        workEntryId: null,
        productId: null,
        kind: "logo",
        mediaId: foreign.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      caller.create({
        businessId: "biz-1",
        workEntryId: null,
        productId: null,
        kind: "logo",
        mediaId: wrongKind.id,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("updates a photo and replaces its media", async () => {
    const { caller, media } = setup();
    const updated = await caller.update({ id: "ph-1", mediaId: "med-2", kind: "logo" });

    expect(updated?.mediaId).toBe("med-2");
    expect(updated?.kind).toBe("logo");
    expect(updated?.workEntryId).toBe("we-1");
    expect(await media.getById("med-1")).toBeNull();
  });

  it("does not let two photos share one media row", async () => {
    const { caller, media } = setup();

    await expect(
      caller.create({
        businessId: "biz-1",
        workEntryId: null,
        productId: null,
        kind: "product",
        mediaId: "med-1",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await media.getById("med-1")).not.toBeNull();
  });

  it("does not let one photo steal another photo's media", async () => {
    const { caller, media } = setup([sample, { ...sample, id: "ph-2", mediaId: "med-2" }]);

    await expect(caller.update({ id: "ph-2", mediaId: "med-1" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(await media.getById("med-1")).not.toBeNull();
    expect(await media.getById("med-2")).not.toBeNull();
  });

  it("keeps the media when the update uses the same media id", async () => {
    const { caller, media } = setup();
    const updated = await caller.update({ id: "ph-1", mediaId: "med-1" });

    expect(updated?.mediaId).toBe("med-1");
    expect(await media.getById("med-1")).not.toBeNull();
  });

  it("allows setting nullable FKs to null explicitly", async () => {
    const { caller } = setup();
    const updated = await caller.update({ id: "ph-1", workEntryId: null, productId: null });

    expect(updated?.workEntryId).toBeNull();
    expect(updated?.productId).toBeNull();
  });

  it("rejects updating a non-existent photo with NOT_FOUND", async () => {
    const { caller } = setup([]);

    await expect(caller.update({ id: "nonexistent", mediaId: "med-1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("deletes a photo, its media and the stored object", async () => {
    const { caller, media, storage } = setup();
    const key = "media/v1/acc-1/businesses/biz-1/product-photo/med-1.jpg";
    storage.confirm(key, 1, "image/jpeg");

    expect(await caller.delete({ id: "ph-1" })).toBe(true);
    expect(await media.getById("med-1")).toBeNull();
    expect(await storage.head(key)).toBeNull();
  });
});
