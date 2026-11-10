import type { Business } from "@aqui-suena/api/domain/directory/business";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { InMemoryFlyerRepository } from "@aqui-suena/api/domain/directory/flyer";
import { InMemoryHourRepository } from "@aqui-suena/api/domain/directory/hour";
import { InMemoryPhotoRepository } from "@aqui-suena/api/domain/directory/photo";
import { InMemoryProductRepository } from "@aqui-suena/api/domain/directory/product";
import { InMemoryServiceRepository } from "@aqui-suena/api/domain/directory/service";
import { InMemoryWorkEntryRepository } from "@aqui-suena/api/domain/directory/work-entry";
import { describe, expect, it } from "vitest";

const now = new Date("2024-01-01T00:00:00Z");

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: "biz-visible",
    accountId: "acc-1",
    name: "Visible business",
    category: "food",
    phone: null,
    email: null,
    address: null,
    timezone: "America/Mexico_City",
    delivery: false,
    hiddenAt: null,
    retainedUntil: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRepositories() {
  const business = new InMemoryBusinessRepository([
    makeBusiness({ id: "biz-visible" }),
    makeBusiness({ id: "biz-hidden", hiddenAt: new Date("2024-02-01T00:00:00Z") }),
  ]);

  return {
    business,
    product: new InMemoryProductRepository(
      [
        {
          id: "product-visible",
          businessId: "biz-visible",
          name: "Visible",
          description: null,
          price: 1,
          createdAt: now,
        },
        {
          id: "product-hidden",
          businessId: "biz-hidden",
          name: "Hidden",
          description: null,
          price: 1,
          createdAt: now,
        },
      ],
      business,
    ),
    service: new InMemoryServiceRepository(
      [
        {
          id: "service-visible",
          businessId: "biz-visible",
          name: "Visible",
          description: null,
          basePrice: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "service-hidden",
          businessId: "biz-hidden",
          name: "Hidden",
          description: null,
          basePrice: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
      business,
    ),
    photo: new InMemoryPhotoRepository(
      [
        {
          id: "photo-visible",
          businessId: "biz-visible",
          workEntryId: null,
          productId: null,
          kind: "logo",
          url: "https://example.com/visible.jpg",
          createdAt: now,
        },
        {
          id: "photo-hidden",
          businessId: "biz-hidden",
          workEntryId: null,
          productId: null,
          kind: "logo",
          url: "https://example.com/hidden.jpg",
          createdAt: now,
        },
      ],
      business,
    ),
    flyer: new InMemoryFlyerRepository(
      [
        {
          id: "flyer-visible",
          businessId: "biz-visible",
          url: "https://example.com/visible.jpg",
          replacedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "flyer-hidden",
          businessId: "biz-hidden",
          url: "https://example.com/hidden.jpg",
          replacedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ],
      business,
    ),
    hour: new InMemoryHourRepository(
      [
        { id: "hour-visible", businessId: "biz-visible", day: 1, openMinute: 0, closeMinute: 60 },
        { id: "hour-hidden", businessId: "biz-hidden", day: 1, openMinute: 0, closeMinute: 60 },
      ],
      business,
    ),
    workEntry: new InMemoryWorkEntryRepository(
      [
        {
          id: "work-visible",
          businessId: "biz-visible",
          title: "Visible",
          description: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "work-hidden",
          businessId: "biz-hidden",
          title: "Hidden",
          description: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
      business,
    ),
  };
}

describe("hidden business visibility", () => {
  it("hides hidden businesses from the public list and getById", async () => {
    const { business } = makeRepositories();

    expect((await business.list()).map((item) => item.id)).toEqual(["biz-visible"]);
    expect(await business.getById("biz-hidden")).toBeNull();
  });

  it("keeps hidden businesses visible to their owner", async () => {
    const { business } = makeRepositories();

    expect(await business.getByIdForOwner("biz-hidden")).not.toBeNull();
    expect((await business.listByAccount("acc-1")).map((item) => item.id)).toContain("biz-hidden");
  });

  it("filters hidden parents out of every public child list", async () => {
    const repositories = makeRepositories();

    expect((await repositories.product.list()).map((item) => item.id)).toEqual(["product-visible"]);
    expect((await repositories.service.list()).map((item) => item.id)).toEqual(["service-visible"]);
    expect((await repositories.photo.list()).map((item) => item.id)).toEqual(["photo-visible"]);
    expect((await repositories.flyer.list()).map((item) => item.id)).toEqual(["flyer-visible"]);
    expect((await repositories.hour.list()).map((item) => item.id)).toEqual(["hour-visible"]);
    expect((await repositories.workEntry.list()).map((item) => item.id)).toEqual(["work-visible"]);
  });
});
