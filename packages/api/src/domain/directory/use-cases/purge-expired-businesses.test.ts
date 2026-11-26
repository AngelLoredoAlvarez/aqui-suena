import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/model/business";
import { PurgeExpiredBusinesses } from "@aqui-suena/api/domain/directory/use-cases/purge-expired-businesses";
import { InMemoryMediaRepository } from "@aqui-suena/api/domain/media/media";
import { InMemoryObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-02-01T00:00:00Z");

async function createBusiness(
  businesses: InMemoryBusinessRepository,
  retention: Date | null,
): Promise<string> {
  const business = await businesses.create({
    accountId: "acc-1",
    name: "One",
    category: "food",
    phone: null,
    email: null,
    address: null,
    timezone: "America/Mexico_City",
    delivery: false,
  });

  if (retention !== null) {
    await businesses.update(business.id, {
      hiddenAt: new Date("2026-01-01T00:00:00Z"),
      retainedUntil: retention,
    });
  }

  return business.id;
}

function setup() {
  const businesses = new InMemoryBusinessRepository([]);
  const media = new InMemoryMediaRepository([]);
  const storage = new InMemoryObjectStorage();
  const purge = new PurgeExpiredBusinesses({ businesses, media, storage });

  return { businesses, media, storage, purge };
}

describe("PurgeExpiredBusinesses", () => {
  it("deletes the objects and rows of an expired business before the business", async () => {
    const { businesses, media, storage, purge } = setup();
    const businessId = await createBusiness(businesses, new Date("2026-01-15T00:00:00Z"));
    const keys = [
      `media/v1/acc-1/businesses/${businessId}/flyer/one.jpg`,
      `media/v1/acc-1/businesses/${businessId}/product-photo/two.webp`,
    ];

    for (const key of keys) {
      storage.confirm(key, 512, "image/jpeg");

      await media.create({
        ownerId: "acc-1",
        businessId,
        kind: "flyer",
        r2Key: key,
        mime: "image/jpeg",
        size: 512,
      });
    }

    expect(await purge.execute(NOW)).toEqual({ businesses: 1, media: 2 });
    expect((await media.listByBusiness({ businessId, limit: 20, offset: 0 })).items).toEqual([]);
    expect(await businesses.getByIdForOwner(businessId)).toBeNull();
    expect(await storage.list("media/")).toEqual([]);
  });

  it("keeps businesses still inside their retention window and their media", async () => {
    const { businesses, media, storage, purge } = setup();

    const businessId = await createBusiness(businesses, new Date("2026-03-01T00:00:00Z"));
    const key = `media/v1/acc-1/businesses/${businessId}/flyer/one.jpg`;
    storage.confirm(key, 512, "image/jpeg");

    await media.create({
      ownerId: "acc-1",
      businessId,
      kind: "flyer",
      r2Key: key,
      mime: "image/jpeg",
      size: 512,
    });

    expect(await purge.execute(NOW)).toEqual({ businesses: 0, media: 0 });
    expect(await businesses.getByIdForOwner(businessId)).not.toBeNull();
    expect(await storage.list("media/")).toHaveLength(1);
  });

  it("deletes an expired business that has no media", async () => {
    const { businesses, purge } = setup();
    const businessId = await createBusiness(businesses, new Date("2026-01-15T00:00:00Z"));

    expect(await purge.execute(NOW)).toEqual({ businesses: 1, media: 0 });
    expect(await businesses.getByIdForOwner(businessId)).toBeNull();
  });
});
