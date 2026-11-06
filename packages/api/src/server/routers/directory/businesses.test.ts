import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions";
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
    const businesses = await caller.list();

    expect(businesses).toHaveLength(1);
    expect(businesses[0]?.id).toBe("biz-1");
    expect(businesses[0]?.name).toBe("Tacos El Güero");
  });

  it("returns null when getById finds nothing", async () => {
    const repository = new InMemoryBusinessRepository([]);
    const router = createBusinessesRouter({
      business: repository,
      subscription: new InMemorySubscriptionRepository([]),
    });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const business = await caller.getById("nonexistent");

    expect(business).toBeNull();
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

  it("returns null when updating a non-existent business", async () => {
    const repository = new InMemoryBusinessRepository([]);
    const router = createBusinessesRouter({
      business: repository,
      subscription: new InMemorySubscriptionRepository([]),
    });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const result = await caller.update({ id: "nonexistent", name: "X" });

    expect(result).toBeNull();
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
});
