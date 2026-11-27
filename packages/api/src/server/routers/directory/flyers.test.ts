import type { Business } from "@aqui-suena/api/domain/directory/model/business";
import type { Flyer } from "@aqui-suena/api/domain/directory/model/flyer";
import type { Media } from "@aqui-suena/api/domain/media/media";
import { InMemoryBusinessRepository } from "@aqui-suena/api/infrastructure/memory/directory/in-memory-business-repository";
import { InMemoryFlyerRepository } from "@aqui-suena/api/infrastructure/memory/directory/in-memory-flyer-repository";
import { InMemoryMediaRepository } from "@aqui-suena/api/infrastructure/memory/media/in-memory-media-repository";
import { InMemoryObjectStorage } from "@aqui-suena/api/infrastructure/memory/media/in-memory-object-storage";
import { createFlyersRouter } from "@aqui-suena/api/server/routers/directory/flyers";
import { describe, expect, it } from "vitest";

const sample: Flyer = {
  id: "fly-1",
  businessId: "biz-1",
  mediaId: "med-1",
  url: null,
  replacedAt: new Date("2024-01-01T00:00:00Z"),
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
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

function makeMedia(id: string, kind: Media["kind"] = "flyer"): Media {
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

function setup(flyers: Flyer[] = [sample], businesses: Business[] = [business]) {
  const repository = new InMemoryFlyerRepository(flyers);
  const media = new InMemoryMediaRepository([makeMedia("med-1"), makeMedia("med-2")]);
  const storage = new InMemoryObjectStorage();

  const router = createFlyersRouter({
    flyer: repository,
    business: new InMemoryBusinessRepository(businesses),
    media,
    storage,
  });

  const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

  return { repository, media, storage, caller };
}

describe("flyers router", () => {
  it("lists flyers from the repository and signs their media", async () => {
    const { caller } = setup();
    const page = await caller.list();

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("fly-1");
    expect(page.items[0]?.url).toBe(
      "https://fake.r2/media/v1/acc-1/businesses/biz-1/flyer/med-1.jpg?signed=1",
    );
  });

  it("keeps a legacy url when the flyer has no media", async () => {
    const { caller } = setup([{ ...sample, mediaId: null, url: "https://example.com/legacy.jpg" }]);

    const page = await caller.list();

    expect(page.items[0]?.url).toBe("https://example.com/legacy.jpg");
  });

  it("rejects getById with NOT_FOUND when nothing matches", async () => {
    const { caller } = setup([]);

    await expect(caller.getById({ id: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects getById for a flyer of a hidden business", async () => {
    const { caller } = setup(
      [sample],
      [{ ...business, hiddenAt: new Date("2024-02-01T00:00:00Z") }],
    );

    await expect(caller.getById({ id: "fly-1" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a malformed id with BAD_REQUEST", async () => {
    const { caller } = setup();

    await expect(caller.getById({ id: 123 as never })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("rejects deleting a missing flyer with NOT_FOUND", async () => {
    const { caller } = setup([]);

    await expect(caller.delete({ id: "nonexistent" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates a flyer linked to media", async () => {
    const { caller, media } = setup([]);
    const created = await caller.create({ businessId: "biz-1", mediaId: "med-1" });

    expect(created.id).toBeTruthy();
    expect(created.mediaId).toBe("med-1");
    expect(created.url).toContain("med-1.jpg");
    expect(await media.getById("med-1")).not.toBeNull();
  });

  it("rejects attaching media of another kind", async () => {
    const { caller, media } = setup();

    const wrongKind = await media.create({
      ownerId: "acc-1",
      businessId: "biz-1",
      kind: "product-photo",
      r2Key: "media/v1/acc-1/businesses/biz-1/product-photo/wrong.jpg",
      mime: "image/jpeg",
      size: 1,
    });

    await expect(
      caller.create({ businessId: "biz-1", mediaId: wrongKind.id }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("updates a flyer media and bumps replacedAt", async () => {
    const { caller, media } = setup();
    const updated = await caller.update({ id: "fly-1", mediaId: "med-2" });

    expect(updated?.mediaId).toBe("med-2");
    expect(updated?.replacedAt.getTime()).toBeGreaterThan(sample.replacedAt.getTime());
    expect(await media.getById("med-1")).toBeNull();
  });

  it("keeps the media when the update uses the same media id", async () => {
    const { caller, media } = setup();
    const updated = await caller.update({ id: "fly-1", mediaId: "med-1" });

    expect(updated?.mediaId).toBe("med-1");
    expect(await media.getById("med-1")).not.toBeNull();
  });

  it("rejects updating a non-existent flyer with NOT_FOUND", async () => {
    const { caller } = setup([]);

    await expect(caller.update({ id: "nonexistent", mediaId: "med-1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("deletes a flyer, its media and the stored object", async () => {
    const { caller, media, storage } = setup();
    const key = "media/v1/acc-1/businesses/biz-1/flyer/med-1.jpg";
    storage.confirm(key, 1, "image/jpeg");

    expect(await caller.delete({ id: "fly-1" })).toBe(true);
    expect(await media.getById("med-1")).toBeNull();
    expect(await storage.head(key)).toBeNull();
  });
});
