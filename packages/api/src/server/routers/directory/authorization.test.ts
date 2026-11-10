import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import type { Business } from "@aqui-suena/api/domain/directory/business";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { InMemoryFlyerRepository } from "@aqui-suena/api/domain/directory/flyer";
import { InMemoryHourRepository } from "@aqui-suena/api/domain/directory/hour";
import { InMemoryPhotoRepository } from "@aqui-suena/api/domain/directory/photo";
import { InMemoryProductRepository } from "@aqui-suena/api/domain/directory/product";
import { InMemoryServiceRepository } from "@aqui-suena/api/domain/directory/service";
import { InMemoryWorkEntryRepository } from "@aqui-suena/api/domain/directory/work-entry";
import { createBusinessesRouter } from "@aqui-suena/api/server/routers/directory/businesses";
import { createFlyersRouter } from "@aqui-suena/api/server/routers/directory/flyers";
import { createHoursRouter } from "@aqui-suena/api/server/routers/directory/hours";
import { createPhotosRouter } from "@aqui-suena/api/server/routers/directory/photos";
import { createProductsRouter } from "@aqui-suena/api/server/routers/directory/products";
import { createServicesRouter } from "@aqui-suena/api/server/routers/directory/services";
import { createWorkEntriesRouter } from "@aqui-suena/api/server/routers/directory/work-entries";
import { describe, expect, it } from "vitest";

const now = new Date("2024-01-01T00:00:00Z");

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: "biz-a",
    accountId: "acc-a",
    name: "Account A business",
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

function setup() {
  const businessRepository = new InMemoryBusinessRepository([
    makeBusiness({ id: "biz-a", accountId: "acc-a" }),
    makeBusiness({ id: "biz-b", accountId: "acc-b" }),
  ]);
  const product = new InMemoryProductRepository([
    {
      id: "product-b",
      businessId: "biz-b",
      name: "Foreign product",
      description: null,
      price: 100,
      createdAt: now,
    },
  ]);
  const photo = new InMemoryPhotoRepository([
    {
      id: "photo-b",
      businessId: "biz-b",
      workEntryId: null,
      productId: null,
      kind: "logo",
      url: "https://example.com/foreign.jpg",
      createdAt: now,
    },
  ]);
  const service = new InMemoryServiceRepository([
    {
      id: "service-b",
      businessId: "biz-b",
      name: "Foreign service",
      description: null,
      basePrice: null,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  const workEntry = new InMemoryWorkEntryRepository([
    {
      id: "work-b",
      businessId: "biz-b",
      title: "Foreign work",
      description: null,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  const flyer = new InMemoryFlyerRepository([
    {
      id: "flyer-b",
      businessId: "biz-b",
      url: "https://example.com/foreign-flyer.jpg",
      replacedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  const hour = new InMemoryHourRepository([
    { id: "hour-b", businessId: "biz-b", day: 1, openMinute: 480, closeMinute: 1080 },
  ]);

  const callerA = { user: { id: "user-a", accountId: "acc-a" } };
  const callerB = { user: { id: "user-b", accountId: "acc-b" } };
  const anonymous = { user: null };

  return {
    businessRepository,
    product,
    photo,
    service,
    workEntry,
    flyer,
    hour,
    callerA,
    callerB,
    anonymous,
  };
}

describe("directory mutation authorization", () => {
  it("rejects updating a product owned by another account with NOT_FOUND", async () => {
    const s = setup();
    const router = createProductsRouter({ product: s.product, business: s.businessRepository });
    const caller = router.createCaller(s.callerA);

    await expect(caller.update({ id: "product-b", name: "Stolen" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect((await s.product.getById("product-b"))?.name).toBe("Foreign product");
  });

  it("rejects deleting a product owned by another account with NOT_FOUND", async () => {
    const s = setup();
    const router = createProductsRouter({ product: s.product, business: s.businessRepository });
    const caller = router.createCaller(s.callerA);

    await expect(caller.delete("product-b")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await s.product.getById("product-b")).not.toBeNull();
  });

  it("rejects creating a product under a foreign business with NOT_FOUND", async () => {
    const s = setup();
    const router = createProductsRouter({ product: s.product, business: s.businessRepository });
    const caller = router.createCaller(s.callerA);

    await expect(
      caller.create({ businessId: "biz-b", name: "Injected", description: null, price: 1 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lets the owner update a product", async () => {
    const s = setup();
    const router = createProductsRouter({ product: s.product, business: s.businessRepository });
    const caller = router.createCaller(s.callerB);

    const updated = await caller.update({ id: "product-b", name: "Mine" });

    expect(updated?.name).toBe("Mine");
  });

  it("rejects updating or deleting a photo owned by another account", async () => {
    const s = setup();
    const router = createPhotosRouter({ photo: s.photo, business: s.businessRepository });
    const caller = router.createCaller(s.callerA);

    await expect(
      caller.update({ id: "photo-b", url: "https://example.com/stolen.jpg" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.delete("photo-b")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects creating a photo under a foreign business", async () => {
    const s = setup();
    const router = createPhotosRouter({ photo: s.photo, business: s.businessRepository });
    const caller = router.createCaller(s.callerA);

    await expect(
      caller.create({
        businessId: "biz-b",
        workEntryId: null,
        productId: null,
        kind: "logo",
        url: "https://example.com/injected.jpg",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects updating or deleting a service owned by another account", async () => {
    const s = setup();
    const router = createServicesRouter({ service: s.service, business: s.businessRepository });
    const caller = router.createCaller(s.callerA);

    await expect(caller.update({ id: "service-b", name: "Stolen" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(caller.delete("service-b")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects creating a service under a foreign business", async () => {
    const s = setup();
    const router = createServicesRouter({ service: s.service, business: s.businessRepository });
    const caller = router.createCaller(s.callerA);

    await expect(
      caller.create({
        businessId: "biz-b",
        name: "Injected",
        description: null,
        basePrice: null,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects updating or deleting a work entry owned by another account", async () => {
    const s = setup();
    const router = createWorkEntriesRouter({
      workEntry: s.workEntry,
      business: s.businessRepository,
    });
    const caller = router.createCaller(s.callerA);

    await expect(caller.update({ id: "work-b", title: "Stolen" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(caller.delete("work-b")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects creating a work entry under a foreign business", async () => {
    const s = setup();
    const router = createWorkEntriesRouter({
      workEntry: s.workEntry,
      business: s.businessRepository,
    });
    const caller = router.createCaller(s.callerA);

    await expect(
      caller.create({ businessId: "biz-b", title: "Injected", description: null }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects updating or deleting a flyer owned by another account", async () => {
    const s = setup();
    const router = createFlyersRouter({ flyer: s.flyer, business: s.businessRepository });
    const caller = router.createCaller(s.callerA);

    await expect(
      caller.update({ id: "flyer-b", url: "https://example.com/stolen.jpg" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.delete("flyer-b")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects creating a flyer under a foreign business", async () => {
    const s = setup();
    const router = createFlyersRouter({ flyer: s.flyer, business: s.businessRepository });
    const caller = router.createCaller(s.callerA);

    await expect(
      caller.create({ businessId: "biz-b", url: "https://example.com/injected.jpg" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects updating or deleting an hour owned by another account", async () => {
    const s = setup();
    const router = createHoursRouter({ hour: s.hour, business: s.businessRepository });
    const caller = router.createCaller(s.callerA);

    await expect(caller.update({ id: "hour-b", day: 2 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(caller.delete("hour-b")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects creating an hour under a foreign business", async () => {
    const s = setup();
    const router = createHoursRouter({ hour: s.hour, business: s.businessRepository });
    const caller = router.createCaller(s.callerA);

    await expect(
      caller.create({ businessId: "biz-b", day: 1, openMinute: 480, closeMinute: 1080 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects updating or deleting a foreign business", async () => {
    const s = setup();
    const router = createBusinessesRouter({
      business: s.businessRepository,
      subscription: new InMemorySubscriptionRepository([]),
    });
    const caller = router.createCaller(s.callerA);

    await expect(caller.update({ id: "biz-b", name: "Stolen" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(caller.delete("biz-b")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await s.businessRepository.getByIdForOwner("biz-b"))?.name).toBe("Account A business");
  });

  it("creates a business for the authenticated account, ignoring the input accountId", async () => {
    const businessRepository = new InMemoryBusinessRepository([
      makeBusiness({ id: "biz-b", accountId: "acc-b" }),
    ]);
    const router = createBusinessesRouter({
      business: businessRepository,
      subscription: new InMemorySubscriptionRepository([]),
    });
    const caller = router.createCaller({ user: { id: "user-a", accountId: "acc-a" } });

    const created = await caller.create({
      accountId: "acc-b",
      name: "Spoofed",
      category: "food",
      phone: null,
      email: null,
      address: null,
      timezone: "America/Mexico_City",
      delivery: false,
    });

    expect(created.accountId).toBe("acc-a");
  });

  it("still rejects unauthenticated mutations with UNAUTHORIZED", async () => {
    const s = setup();
    const router = createProductsRouter({ product: s.product, business: s.businessRepository });
    const caller = router.createCaller(s.anonymous);

    await expect(
      caller.create({ businessId: "biz-a", name: "Nope", description: null, price: 1 }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
