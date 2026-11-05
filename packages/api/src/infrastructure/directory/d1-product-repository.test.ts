import { D1ProductRepository } from "@aqui-suena/api/infrastructure/directory/d1-product-repository";
import { describe, expect, it } from "vitest";

describe("D1ProductRepository", () => {
  it("maps D1 rows into products", async () => {
    const fakeDb = {
      prepare: () => ({
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
    } as unknown as D1Database;

    const repository = new D1ProductRepository(fakeDb);
    const products = await repository.list();

    expect(products).toHaveLength(1);
    expect(products[0]?.id).toBe("pdct-1");
    expect(products[0]?.businessId).toBe("biz-1");
    expect(products[0]?.name).toBe("SSD Samsung 990 Pro 1TB");
    expect(products[0]?.description).toBe("Disco duro solido de alta velocidad");
    expect(products[0]?.price).toBe(10000);
    expect(products[0]?.createdAt).toBeInstanceOf(Date);
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

  it("lists only products belonging to the given business", async () => {
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
    const products = await repository.listByBusiness("biz-1");

    expect(products).toHaveLength(1);
    expect(products[0]?.businessId).toBe("biz-1");
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
