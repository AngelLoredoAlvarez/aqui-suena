import { D1ProductRepository } from "@aqui-suena/api/infrastructure/directory/d1-product-repository";
import { describe, expect, it } from "vitest";

describe("D1ProductRepository", () => {
  it("maps D1 rows into products", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({
            results: [
              {
                id: "pdct-1",
                business_id: "biz-1",
                name: "SSD Samsung 990 Pro 1TB",
                description: "Disco duro solido de alta velocidad",
                price: 10000,
                created_at: 1700000000,
              },
            ],
          }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1ProductRepository(fakeDb);
    const page = await repository.listByBusiness({ businessId: "biz-1", limit: 20, offset: 0 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("pdct-1");
    expect(page.items[0]?.businessId).toBe("biz-1");
    expect(page.items[0]?.name).toBe("SSD Samsung 990 Pro 1TB");
    expect(page.items[0]?.description).toBe("Disco duro solido de alta velocidad");
    expect(page.items[0]?.price).toBe(10000);
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

    const repository = new D1ProductRepository(fakeDb);
    const product = await repository.getById("nonexistent");

    expect(product).toBeNull();
  });

  it("pages products by business with deterministic order, LIMIT and OFFSET", async () => {
    const statements: Array<{ sql: string; params: unknown[] }> = [];
    const fakeDb = {
      prepare: (sql: string) => ({
        bind: (...params: unknown[]) => {
          statements.push({ sql, params });

          return { all: async () => ({ results: [] }) };
        },
      }),
    } as unknown as D1Database;

    const repository = new D1ProductRepository(fakeDb);

    await repository.listByBusiness({ businessId: "biz-1", limit: 5, offset: 10 });

    expect(statements[0]?.sql).toMatch(
      /WHERE business_id = \? ORDER BY created_at, id LIMIT \? OFFSET \?/,
    );
    expect(statements[0]?.params).toEqual(["biz-1", 5, 10]);
  });

  it("lists every product of a business without paging", async () => {
    const statements: string[] = [];
    const fakeDb = {
      prepare: (sql: string) => {
        statements.push(sql);

        return {
          bind: () => ({ all: async () => ({ results: [] }) }),
        };
      },
    } as unknown as D1Database;

    const repository = new D1ProductRepository(fakeDb);

    expect(await repository.listAllByBusiness("biz-1")).toEqual([]);
    expect(statements[0]).toMatch(/WHERE business_id = \?/);
    expect(statements[0]).not.toMatch(/LIMIT/);
  });

  it("creates a product and returns it with generated id and timestamps", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const respository = new D1ProductRepository(fakeDb);
    const product = await respository.create({
      businessId: "biz-1",
      name: "SSD Samsung 990 Pro 1TB",
      description: "Disco duro solido de alta velocidad",
      price: 10000,
    });

    expect(product?.businessId).toBe("biz-1");
    expect(product?.name).toBe("SSD Samsung 990 Pro 1TB");
    expect(product?.description).toBe("Disco duro solido de alta velocidad");
    expect(product?.price).toBe(10000);
    expect(product?.createdAt).toBeInstanceOf(Date);
  });

  it("updates only the provided fields and preserves the rest", async () => {
    const existingRow = {
      id: "pdct-1",
      business_id: "biz-1",
      name: "SSD Samsung 990 Pro 1TB",
      description: "Disco duro solido de alta velocidad",
      price: 10000,
      created_at: 1700000000,
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

    const repository = new D1ProductRepository(fakeDb);
    const updated = await repository.update("pdct-1", {
      name: "SSD Samsung 980 Pro 2TB",
      price: 9000,
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe("SSD Samsung 980 Pro 2TB");
    expect(updated?.price).toBe(9000);
    expect(updated?.description).toBe("Disco duro solido de alta velocidad");
    expect(updated?.createdAt.getTime()).toBe(existingRow.created_at * 1000);
  });

  it("returns null when updating a non-existent product", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1ProductRepository(fakeDb);
    const result = await repository.update("nonexistent", { name: "X" });
    expect(result).toBeNull();
  });

  it("allows setting a field to null explicitly", async () => {
    const existingRow = {
      id: "pdct-1",
      business_id: "biz-1",
      name: "SSD Samsung 990 Pro 1TB",
      description: "Disco duro solido de alta velocidad",
      price: 10000,
      created_at: 1700000000,
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

    const repository = new D1ProductRepository(fakeDb);
    const updated = await repository.update("pdct-1", { description: null });

    expect(updated?.description).toBeNull();
  });

  it("deletes an existing product and returns true", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true, meta: { changes: 1 } }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1ProductRepository(fakeDb);
    const deleted = await repository.delete("pdct-1");

    expect(deleted).toBe(true);
  });

  it("returns false when deleting a non-existent product", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true, meta: { changes: 0 } }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1ProductRepository(fakeDb);
    const deleted = await repository.delete("nonexistent");

    expect(deleted).toBe(false);
  });
});
