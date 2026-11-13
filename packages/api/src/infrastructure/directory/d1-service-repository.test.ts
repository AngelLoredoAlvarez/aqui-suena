import { D1ServiceRepository } from "@aqui-suena/api/infrastructure/directory/d1-service-repository";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

const sampleRow = {
  id: "svc-1",
  business_id: "biz-1",
  name: "Corte de cabello",
  description: "Corte clásico",
  base_price: 15000,
  created_at: 1700000000,
  updated_at: 1700000000,
};

describe("D1ServiceRepository", () => {
  it("maps D1 rows into services", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repository = new D1ServiceRepository(fake.db);

    const page = await repository.listByBusiness({ businessId: "biz-1", limit: 20, offset: 0 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("svc-1");
    expect(page.items[0]?.businessId).toBe("biz-1");
    expect(page.items[0]?.name).toBe("Corte de cabello");
    expect(page.items[0]?.basePrice).toBe(15000);
    expect(page.items[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("returns null when getById finds nothing", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repository = new D1ServiceRepository(fake.db);

    expect(await repository.getById("nonexistent")).toBeNull();
  });

  it("lists only services belonging to the given business", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repository = new D1ServiceRepository(fake.db);

    const page = await repository.listByBusiness({ businessId: "biz-1", limit: 20, offset: 0 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.businessId).toBe("biz-1");
  });

  it("creates a service and returns it with generated id and timestamps", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repository = new D1ServiceRepository(fake.db);

    const service = await repository.create({
      businessId: "biz-1",
      name: "Corte de cabello",
      description: "Corte clásico",
      basePrice: 15000,
    });

    expect(service.id).toBeTruthy();
    expect(service.businessId).toBe("biz-1");
    expect(service.name).toBe("Corte de cabello");
    expect(service.description).toBe("Corte clásico");
    expect(service.basePrice).toBe(15000);
    expect(service.createdAt).toBeInstanceOf(Date);
    expect(service.updatedAt).toBeInstanceOf(Date);
  });

  it("updates only the provided fields and preserves the rest", async () => {
    const fake = new FakeD1Database(({ sql }) => {
      if (sql.includes("WHERE id = ?")) return { first: sampleRow };

      return { run: { success: true } };
    });
    const repository = new D1ServiceRepository(fake.db);

    const updated = await repository.update("svc-1", {
      name: "Corte premium",
      basePrice: 20000,
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe("Corte premium");
    expect(updated?.basePrice).toBe(20000);
    expect(updated?.description).toBe("Corte clásico");
    expect(updated?.updatedAt).toBeInstanceOf(Date);
  });

  it("returns null when updating a non-existent service", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repository = new D1ServiceRepository(fake.db);

    expect(await repository.update("nonexistent", { name: "X" })).toBeNull();
  });

  it("allows setting a field to null explicitly", async () => {
    const fake = new FakeD1Database(({ sql }) => {
      if (sql.includes("WHERE id = ?")) return { first: sampleRow };

      return { run: { success: true } };
    });
    const repository = new D1ServiceRepository(fake.db);

    const updated = await repository.update("svc-1", { description: null, basePrice: null });

    expect(updated?.description).toBeNull();
    expect(updated?.basePrice).toBeNull();
  });

  it("deletes an existing service and returns true", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 1 } }));
    const repository = new D1ServiceRepository(fake.db);

    expect(await repository.delete("svc-1")).toBe(true);
  });

  it("returns false when deleting a non-existent service", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 0 } }));
    const repository = new D1ServiceRepository(fake.db);

    expect(await repository.delete("nonexistent")).toBe(false);
  });
});
