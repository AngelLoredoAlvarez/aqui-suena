import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { createBusinessesRouter } from "@aqui-suena/api/server/routers/directory/businesses";
import { describe, expect, it } from "vitest";

const sampleBusiness = {
  id: "biz-1",
  accountId: "acc-1",
  name: "Tacos El Güero",
  category: "food" as const,
  phone: "+521234567890",
  email: "tacos@example.com",
  address: "Calle Falsa 123",
  timezone: "America/Mexico_City",
  delivery: true,
  hiddenAt: null,
  retainedUntil: null,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

describe("businesses router", () => {
  it("lists businesses from the repository", async () => {
    const repository = new InMemoryBusinessRepository([sampleBusiness]);
    const router = createBusinessesRouter({
      business: repository,
      subscription: new InMemorySubscriptionRepository([]),
    });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const page = await caller.list();

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("biz-1");
    expect(page.items[0]?.name).toBe("Tacos El Güero");
  });

  it("rejects getById with NOT_FOUND when nothing matches", async () => {
    const repository = new InMemoryBusinessRepository([]);
    const router = createBusinessesRouter({
      business: repository,
      subscription: new InMemorySubscriptionRepository([]),
    });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    await expect(caller.getById("nonexistent")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a malformed id with BAD_REQUEST", async () => {
    const repository = new InMemoryBusinessRepository([]);
    const router = createBusinessesRouter({
      business: repository,
      subscription: new InMemorySubscriptionRepository([]),
    });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    await expect(caller.getById(123 as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects deleting a missing business with NOT_FOUND", async () => {
    const repository = new InMemoryBusinessRepository([]);
    const router = createBusinessesRouter({
      business: repository,
      subscription: new InMemorySubscriptionRepository([]),
    });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    await expect(caller.delete("nonexistent")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates a business and returns it with a generated id", async () => {
    const repository = new InMemoryBusinessRepository([]);
    const router = createBusinessesRouter({
      business: repository,
      subscription: new InMemorySubscriptionRepository([]),
    });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const created = await caller.create({
      accountId: "acc-1",
      name: "Tacos El Güero",
      category: "food",
      phone: "+521234567890",
      email: "tacos@example.com",
      address: "Calle Falsa 123",
      timezone: "America/Mexico_City",
      delivery: true,
    });

    expect(created.id).toBeTruthy();
    expect(created.name).toBe("Tacos El Güero");
    expect(created.category).toBe("food");
  });

  it("updates a business and preserves unprovided fields", async () => {
    const repository = new InMemoryBusinessRepository([{ ...sampleBusiness }]);
    const router = createBusinessesRouter({
      business: repository,
      subscription: new InMemorySubscriptionRepository([]),
    });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const updated = await caller.update({
      id: "biz-1",
      name: "Tacos El Güero V2",
      delivery: false,
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe("Tacos El Güero V2");
    expect(updated?.delivery).toBe(false);
    expect(updated?.phone).toBe("+521234567890");
  });

  it("rejects updating a non-existent business with NOT_FOUND", async () => {
    const repository = new InMemoryBusinessRepository([]);
    const router = createBusinessesRouter({
      business: repository,
      subscription: new InMemorySubscriptionRepository([]),
    });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    await expect(caller.update({ id: "nonexistent", name: "X" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("deletes a business and reports success", async () => {
    const repository = new InMemoryBusinessRepository([{ ...sampleBusiness }]);
    const router = createBusinessesRouter({
      business: repository,
      subscription: new InMemorySubscriptionRepository([]),
    });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const deleted = await caller.delete("biz-1");

    expect(deleted).toBe(true);
  });

  it("hides a hidden business from the public list and getById", async () => {
    const hidden = {
      ...sampleBusiness,
      id: "biz-hidden",
      hiddenAt: new Date("2024-02-01T00:00:00Z"),
    };
    const repository = new InMemoryBusinessRepository([hidden]);
    const router = createBusinessesRouter({
      business: repository,
      subscription: new InMemorySubscriptionRepository([]),
    });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect((await caller.list()).items).toEqual([]);
    await expect(caller.getById("biz-hidden")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns hidden businesses through the owner endpoints", async () => {
    const hidden = {
      ...sampleBusiness,
      id: "biz-hidden",
      hiddenAt: new Date("2024-02-01T00:00:00Z"),
    };
    const repository = new InMemoryBusinessRepository([hidden]);
    const router = createBusinessesRouter({
      business: repository,
      subscription: new InMemorySubscriptionRepository([]),
    });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect((await caller.listMine()).items.map((item) => item.id)).toEqual(["biz-hidden"]);
    expect((await caller.getMine("biz-hidden"))?.id).toBe("biz-hidden");
  });

  it("does not return another account's business through the owner endpoint", async () => {
    const foreign = {
      ...sampleBusiness,
      id: "biz-foreign",
      accountId: "acc-2",
      hiddenAt: new Date("2024-02-01T00:00:00Z"),
    };
    const repository = new InMemoryBusinessRepository([foreign]);
    const router = createBusinessesRouter({
      business: repository,
      subscription: new InMemorySubscriptionRepository([]),
    });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    await expect(caller.getMine("biz-foreign")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects creating a business when the account cap is reached", async () => {
    const repository = new InMemoryBusinessRepository([{ ...sampleBusiness }]);
    const subscriptionRepository = new InMemorySubscriptionRepository([]);

    await subscriptionRepository.create(
      "acc-1",
      "community",
      new Date("2024-01-01T00:00:00Z"),
      new Date("2025-01-01T00:00:00Z"),
    );

    const router = createBusinessesRouter({
      business: repository,
      subscription: subscriptionRepository,
    });

    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    await expect(
      caller.create({
        accountId: "acc-1",
        name: "Otro negocio",
        category: "food",
        phone: null,
        email: null,
        address: null,
        timezone: "America/Mexico_City",
        delivery: false,
      }),
    ).rejects.toThrow(/UPGRADE_REQUIRED/);
  });

  it("paginates the owner's businesses with offset", async () => {
    const repository = new InMemoryBusinessRepository([
      { ...sampleBusiness, id: "biz-late", createdAt: new Date("2024-01-02T00:00:00Z") },
      { ...sampleBusiness, id: "biz-early", createdAt: new Date("2024-01-01T00:00:00Z") },
      { ...sampleBusiness, id: "biz-foreign", accountId: "acc-2" },
    ]);
    const router = createBusinessesRouter({
      business: repository,
      subscription: new InMemorySubscriptionRepository([]),
    });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    const first = await caller.listMine({ limit: 1 });

    expect(first.items.map((item) => item.id)).toEqual(["biz-early"]);
    expect(first).toMatchObject({ limit: 1, offset: 0, nextOffset: 1 });

    const second = await caller.listMine({ limit: 1, offset: 1 });

    expect(second.items.map((item) => item.id)).toEqual(["biz-late"]);
    expect(second.nextOffset).toBe(2);

    const third = await caller.listMine({ limit: 1, offset: 2 });

    expect(third.items).toEqual([]);
    expect(third.nextOffset).toBeNull();
  });

  it("applies the pagination defaults and rejects out-of-range values", async () => {
    const repository = new InMemoryBusinessRepository([sampleBusiness]);
    const router = createBusinessesRouter({
      business: repository,
      subscription: new InMemorySubscriptionRepository([]),
    });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    await expect(caller.listMine()).resolves.toMatchObject({
      limit: 20,
      offset: 0,
      nextOffset: null,
    });
    await expect(caller.listMine({ limit: 101 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.listMine({ offset: -1 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
