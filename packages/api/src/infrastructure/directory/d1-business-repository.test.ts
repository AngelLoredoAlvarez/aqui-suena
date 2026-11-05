import { D1BusinessRepository } from "@aqui-suena/api/infrastructure/directory/d1-business-repository";
import { describe, expect, it } from "vitest";

describe("D1BusinessRepository", () => {
  it("maps D1 rows into businesses", async () => {
    const fakeDb = {
      prepare: () => ({
        all: async () => ({
          results: [
            {
              id: "biz-1",
              account_id: "acc-1",
              name: "Tacos El Güero",
              category: "food",
              phone: "+521234567890",
              email: "tacos@example.com",
              address: "Calle Falsa 123",
              timezone: "America/Mexico_City",
              delivery: 1,
              created_at: 1700000000,
              updated_at: 1700000000,
            },
          ],
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1BusinessRepository(fakeDb);
    const businesses = await repository.list();

    expect(businesses).toHaveLength(1);
    expect(businesses[0]?.id).toBe("biz-1");
    expect(businesses[0]?.accountId).toBe("acc-1");
    expect(businesses[0]?.name).toBe("Tacos El Güero");
    expect(businesses[0]?.category).toBe("food");
    expect(businesses[0]?.delivery).toBe(true);
    expect(businesses[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("returns null when getById finds nothing", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1BusinessRepository(fakeDb);
    const business = await repository.getById("nonexistent");

    expect(business).toBeNull();
  });

  it("lists only businesses belonging to the given account", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({
            results: [
              {
                id: "biz-1",
                account_id: "acc-1",
                name: "Tacos El Güero",
                category: "food",
                phone: null,
                email: null,
                address: null,
                timezone: "America/Mexico_City",
                delivery: 0,
                created_at: 1700000000,
                updated_at: 1700000000,
              },
            ],
          }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1BusinessRepository(fakeDb);
    const businesses = await repository.listByAccount("acc-1");

    expect(businesses).toHaveLength(1);
    expect(businesses[0]?.accountId).toBe("acc-1");
  });

  it("creates a business and returns it with generated id and timestamps", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1BusinessRepository(fakeDb);
    const business = await repository.create({
      accountId: "acc-1",
      name: "Tacos El Güero",
      category: "food",
      phone: "+521234567890",
      email: "tacos@example.com",
      address: "Calle Falsa 123",
      timezone: "America/Mexico_City",
      delivery: true,
    });

    expect(business.id).toBeTruthy();
    expect(business.accountId).toBe("acc-1");
    expect(business.name).toBe("Tacos El Güero");
    expect(business.category).toBe("food");
    expect(business.delivery).toBe(true);
    expect(business.createdAt).toBeInstanceOf(Date);
    expect(business.updatedAt).toBeInstanceOf(Date);
  });

  it("updates only the provided fields and preserves the rest", async () => {
    const existingRow = {
      id: "biz-1",
      account_id: "acc-1",
      name: "Tacos El Güero",
      category: "food",
      phone: "+521234567890",
      email: "tacos@example.com",
      address: "Calle Falsa 123",
      timezone: "America/Mexico_City",
      delivery: 1,
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

    const repository = new D1BusinessRepository(fakeDb);
    const updated = await repository.update("biz-1", {
      name: "Tacos El Güero V2",
      delivery: false,
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe("Tacos El Güero V2");
    expect(updated?.delivery).toBe(false);
    expect(updated?.phone).toBe("+521234567890");
    expect(updated?.category).toBe("food");
    expect(updated?.updatedAt).toBeInstanceOf(Date);
  });

  it("returns null when updating a non-existent business", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1BusinessRepository(fakeDb);
    const result = await repository.update("nonexistent", { name: "X" });

    expect(result).toBeNull();
  });

  it("allows setting a field to null explicitly", async () => {
    const existingRow = {
      id: "biz-1",
      account_id: "acc-1",
      name: "Tacos El Güero",
      category: "food",
      phone: "+521234567890",
      email: "tacos@example.com",
      address: "Calle Falsa 123",
      timezone: "America/Mexico_City",
      delivery: 1,
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

    const repository = new D1BusinessRepository(fakeDb);
    const updated = await repository.update("biz-1", { phone: null });

    expect(updated?.phone).toBeNull();
  });

  it("deletes an existing business and returns true", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true, meta: { changes: 1 } }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1BusinessRepository(fakeDb);
    const deleted = await repository.delete("biz-1");

    expect(deleted).toBe(true);
  });

  it("returns false when deleting a non-existent business", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true, meta: { changes: 0 } }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1BusinessRepository(fakeDb);
    const deleted = await repository.delete("nonexistent");

    expect(deleted).toBe(false);
  });
});
