import { D1FlyerRepository } from "@aqui-suena/api/infrastructure/directory/d1-flyer-repository";
import { describe, expect, it } from "vitest";

describe("D1FlyerRepository", () => {
  it("maps D1 rows into flyers", async () => {
    const fakeDb = {
      prepare: () => ({
        all: async () => ({
          results: [
            {
              id: "fly-1",
              business_id: "biz-1",
              url: "https://example.com/flyer.jpg",
              replaced_at: 1700000000,
              created_at: 1700000000,
              updated_at: 1700000000,
            },
          ],
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1FlyerRepository(fakeDb);
    const flyers = await repository.list();

    expect(flyers).toHaveLength(1);
    expect(flyers[0]?.id).toBe("fly-1");
    expect(flyers[0]?.businessId).toBe("biz-1");
    expect(flyers[0]?.url).toBe("https://example.com/flyer.jpg");
    expect(flyers[0]?.replacedAt).toBeInstanceOf(Date);
    expect(flyers[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("returns null when getById finds nothing", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1FlyerRepository(fakeDb);
    const flyer = await repository.getById("nonexistent");
    expect(flyer).toBeNull();
  });

  it("lists only flyers belonging to the given business", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({
            results: [
              {
                id: "fly-1",
                business_id: "biz-1",
                url: "https://example.com/flyer.jpg",
                replaced_at: 1700000000,
                created_at: 1700000000,
                updated_at: 1700000000,
              },
            ],
          }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1FlyerRepository(fakeDb);
    const flyers = await repository.listByBusiness("biz-1");

    expect(flyers).toHaveLength(1);
    expect(flyers[0]?.businessId).toBe("biz-1");
  });

  it("creates a flyer and returns it with generated id and timestamps", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1FlyerRepository(fakeDb);
    const flyer = await repository.create({
      businessId: "biz-1",
      url: "https://example.com/flyer.jpg",
    });

    expect(flyer).not.toBeNull();
    expect(flyer.id).toBeTruthy();
    expect(flyer.businessId).toBe("biz-1");
    expect(flyer.url).toBe("https://example.com/flyer.jpg");
    expect(flyer.replacedAt).toBeInstanceOf(Date);
    expect(flyer.createdAt).toBeInstanceOf(Date);
    expect(flyer.updatedAt).toBeInstanceOf(Date);
  });

  it("updates url and bumps replacedAt, preserving the rest", async () => {
    const existingRow = {
      id: "fly-1",
      business_id: "biz-1",
      url: "https://example.com/old.jpg",
      replaced_at: 1700000000,
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

    const repository = new D1FlyerRepository(fakeDb);
    const updated = await repository.update("fly-1", {
      url: "https://example.com/new.jpg",
    });

    expect(updated).not.toBeNull();
    expect(updated?.url).toBe("https://example.com/new.jpg");
    expect(updated?.replacedAt.getTime()).toBeGreaterThan(1700000000 * 1000);
    expect(updated?.createdAt.getTime()).toBe(1700000000 * 1000);
    expect(updated?.updatedAt).toBeInstanceOf(Date);
  });

  it("returns null when updating a non-existent flyer", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1FlyerRepository(fakeDb);
    const result = await repository.update("nonexistent", { url: "https://example.com/x.jpg" });
    expect(result).toBeNull();
  });

  it("deletes an existing flyer and returns true", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true, meta: { changes: 1 } }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1FlyerRepository(fakeDb);
    const deleted = await repository.delete("fly-1");
    expect(deleted).toBe(true);
  });

  it("returns false when deleting a non-existent flyer", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true, meta: { changes: 0 } }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1FlyerRepository(fakeDb);
    const deleted = await repository.delete("nonexistent");
    expect(deleted).toBe(false);
  });
});
