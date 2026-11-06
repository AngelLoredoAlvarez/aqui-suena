import { InMemoryServiceRepository } from "@aqui-suena/api/domain/directory/service";
import { describe, expect, it } from "vitest";
import { createServicesRouter } from "./services";

const sample = {
  id: "svc-1",
  businessId: "biz-1",
  name: "Corte de cabello",
  description: "Corte clasico",
  basePrice: 15000,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

describe("services router", () => {
  it("lists services from the repository", async () => {
    const repository = new InMemoryServiceRepository([{ ...sample }]);
    const router = createServicesRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const services = await caller.list();

    expect(services).toHaveLength(1);
    expect(services[0]?.id).toBe("svc-1");
  });

  it("returns null when getById finds nothing", async () => {
    const repository = new InMemoryServiceRepository([]);
    const router = createServicesRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.getById("nonexistent")).toBeNull();
  });

  it("creates a service with generated id", async () => {
    const repository = new InMemoryServiceRepository([]);
    const router = createServicesRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
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
    const repository = new InMemoryServiceRepository([{ ...sample }]);
    const router = createServicesRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const updated = await caller.update({ id: "svc-1", name: "Corte premium", basePrice: 20000 });

    expect(updated?.name).toBe("Corte premium");
    expect(updated?.basePrice).toBe(20000);
    expect(updated?.description).toBe("Corte clasico");
  });

  it("returns null when updating a non-existent service", async () => {
    const repository = new InMemoryServiceRepository([]);
    const router = createServicesRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.update({ id: "nonexistent", name: "X" })).toBeNull();
  });

  it("deletes a service and reports success", async () => {
    const repository = new InMemoryServiceRepository([{ ...sample }]);
    const router = createServicesRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.delete("svc-1")).toBe(true);
  });
});
