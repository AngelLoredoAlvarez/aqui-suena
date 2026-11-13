import { D1ServiceRepository } from "@aqui-suena/api/infrastructure/directory/d1-service-repository";
import { describe, expect, it } from "vitest";

describe("D1ServiceRepository", () => {
  it("maps D1 rows into services", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({
            results: [
              {
                id: "svc-1",
                business_id: "biz-1",
                name: "Corte de cabello",
                description: "Corte clásico",
                base_price: 15000,
                created_at: 1700000000,
                updated_at: 1700000000,
              },
            ],
          }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1ServiceRepository(fakeDb);
    const page = await repository.listByBusiness({ businessId: "biz-1", limit: 20, offset: 0 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("svc-1");
    expect(page.items[0]?.businessId).toBe("biz-1");
    expect(page.items[0]?.name).toBe("Corte de cabello");
    expect(page.items[0]?.basePrice).toBe(15000);
    expect(page.items[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("returns null when getById finds nothing", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1ServiceRepository(fakeDb);
    const service = await repository.getById("nonexistent");

    expect(service).toBeNull();
  });

  it("lists only services belonging to the given business", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({
            results: [
              {
                id: "svc-1",
                business_id: "biz-1",
                name: "Corte de cabello",
                description: null,
                base_price: null,
                created_at: 1700000000,
                updated_at: 1700000000,
              },
            ],
          }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1ServiceRepository(fakeDb);
    const page = await repository.listByBusiness({ businessId: "biz-1", limit: 20, offset: 0 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.businessId).toBe("biz-1");
  });

  it("creates a service and returns it with generated id and timestamps", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1ServiceRepository(fakeDb);
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
    const existingRow = {
      id: "svc-1",
      business_id: "biz-1",
      name: "Corte de cabello",
      description: "Corte clásico",
      base_price: 15000,
      created_at: 1700000000,
      updated_at: 1700000000,
    };

    const fakeDb = {
      prepare: (sql: string) => {
        if (sql.includes("SELECT") && sql.includes("WHERE id = ?")) {
          return {
            bind: () => ({
              first: async () => existingRow,
            }),
          };
        }

        if (sql.includes("UPDATE")) {
          return {
            bind: () => ({
              run: async () => ({ success: true }),
            }),
          };
        }

        return {
          all: async () => ({ results: [] }),
          bind: () => ({ all: async () => ({ results: [] }), first: async () => null }),
        };
      },
    } as unknown as D1Database;

    const repository = new D1ServiceRepository(fakeDb);
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
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1ServiceRepository(fakeDb);
    const result = await repository.update("nonexistent", { name: "X" });
    expect(result).toBeNull();
  });

  it("allows setting a field to null explicitly", async () => {
    const existingRow = {
      id: "svc-1",
      business_id: "biz-1",
      name: "Corte de cabello",
      description: "Corte clásico",
      base_price: 15000,
      created_at: 1700000000,
      updated_at: 1700000000,
    };

    const fakeDb = {
      prepare: (sql: string) => {
        if (sql.includes("SELECT") && sql.includes("WHERE id = ?")) {
          return {
            bind: () => ({
              first: async () => existingRow,
            }),
          };
        }

        if (sql.includes("UPDATE")) {
          return {
            bind: () => ({
              run: async () => ({ success: true }),
            }),
          };
        }

        return {
          all: async () => ({ results: [] }),
          bind: () => ({ all: async () => ({ results: [] }), first: async () => null }),
        };
      },
    } as unknown as D1Database;

    const repository = new D1ServiceRepository(fakeDb);
    const updated = await repository.update("svc-1", { description: null, basePrice: null });

    expect(updated?.description).toBeNull();
    expect(updated?.basePrice).toBeNull();
  });

  it("deletes an existing service and returns true", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true, meta: { changes: 1 } }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1ServiceRepository(fakeDb);
    const deleted = await repository.delete("svc-1");
    expect(deleted).toBe(true);
  });

  it("returns false when deleting a non-existent service", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true, meta: { changes: 0 } }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1ServiceRepository(fakeDb);
    const deleted = await repository.delete("nonexistent");
    expect(deleted).toBe(false);
  });
});
