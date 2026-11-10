import type { Business } from "@aqui-suena/api/domain/directory/business";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { InMemoryServiceRepository } from "@aqui-suena/api/domain/directory/service";
import { createServicesRouter } from "@aqui-suena/api/server/routers/directory/services";
import { describe, expect, it } from "vitest";

const sample = {
  id: "svc-1",
  businessId: "biz-1",
  name: "Corte de cabello",
  description: "Corte clasico",
  basePrice: 15000,
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

function setup(services = [sample]) {
  const repository = new InMemoryServiceRepository(services);
  const router = createServicesRouter({
    service: repository,
    business: new InMemoryBusinessRepository([business]),
  });
  const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

  return { repository, caller };
}

describe("services router", () => {
  it("lists services from the repository", async () => {
    const { caller } = setup();
    const services = await caller.list();

    expect(services).toHaveLength(1);
    expect(services[0]?.id).toBe("svc-1");
  });

  it("rejects getById with NOT_FOUND when nothing matches", async () => {
    const { caller } = setup([]);

    await expect(caller.getById("nonexistent")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a malformed id with BAD_REQUEST", async () => {
    const { caller } = setup();

    await expect(caller.getById(123 as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects deleting a missing service with NOT_FOUND", async () => {
    const { caller } = setup([]);

    await expect(caller.delete("nonexistent")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates a service with generated id", async () => {
    const { caller } = setup([]);
    const created = await caller.create({
      businessId: "biz-1",
      name: "Corte",
      description: null,
      basePrice: null,
    });

    expect(created.id).toBeTruthy();
    expect(created.name).toBe("Corte");
    expect(created.basePrice).toBeNull();
  });

  it("updates a service and preserves unprovided fields", async () => {
    const { caller } = setup();
    const updated = await caller.update({ id: "svc-1", name: "Corte premium", basePrice: 20000 });

    expect(updated?.name).toBe("Corte premium");
    expect(updated?.basePrice).toBe(20000);
    expect(updated?.description).toBe("Corte clasico");
  });

  it("rejects updating a non-existent service with NOT_FOUND", async () => {
    const { caller } = setup([]);

    await expect(caller.update({ id: "nonexistent", name: "X" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("deletes a service and reports success", async () => {
    const { caller } = setup();

    expect(await caller.delete("svc-1")).toBe(true);
  });
});
