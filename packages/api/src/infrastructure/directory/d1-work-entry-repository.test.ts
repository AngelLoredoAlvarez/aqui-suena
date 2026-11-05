import { D1WorkEntryRepository } from "@aqui-suena/api/infrastructure/directory/d1-work-entry-repository";
import { describe, expect, it } from "vitest";

describe("D1WorkEntryRepository", () => {
  it("maps D1 rows into work entries", async () => {
    const fakeDb = {
      prepare: () => ({
        all: async () => ({
          results: [
            {
              id: "we-1",
              business_id: "biz-1",
              title: "Reparación de laptop",
              description: "Cambio de pantalla",
              created_at: 1700000000,
              updated_at: 1700000000,
            },
          ],
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1WorkEntryRepository(fakeDb);
    const entries = await repository.list();

    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe("we-1");
    expect(entries[0]?.businessId).toBe("biz-1");
    expect(entries[0]?.title).toBe("Reparación de laptop");
    expect(entries[0]?.description).toBe("Cambio de pantalla");
    expect(entries[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("returns null when getById finds nothing", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1WorkEntryRepository(fakeDb);
    const entry = await repository.getById("nonexistent");
    expect(entry).toBeNull();
  });

  it("lists only work entries belonging to the given business", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({
            results: [
              {
                id: "we-1",
                business_id: "biz-1",
                title: "Reparación de laptop",
                description: null,
                created_at: 1700000000,
                updated_at: 1700000000,
              },
            ],
          }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1WorkEntryRepository(fakeDb);
    const entries = await repository.listByBusiness("biz-1");

    expect(entries).toHaveLength(1);
    expect(entries[0]?.businessId).toBe("biz-1");
  });

  it("creates a work entry and returns it with generated id and timestamps", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1WorkEntryRepository(fakeDb);
    const entry = await repository.create({
      businessId: "biz-1",
      title: "Reparación de laptop",
      description: "Cambio de pantalla",
    });

    expect(entry).not.toBeNull();
    expect(entry.id).toBeTruthy();
    expect(entry.businessId).toBe("biz-1");
    expect(entry.title).toBe("Reparación de laptop");
    expect(entry.description).toBe("Cambio de pantalla");
    expect(entry.createdAt).toBeInstanceOf(Date);
    expect(entry.updatedAt).toBeInstanceOf(Date);
  });

  it("updates only the provided fields and preserves the rest", async () => {
    const existingRow = {
      id: "we-1",
      business_id: "biz-1",
      title: "Reparación de laptop",
      description: "Cambio de pantalla",
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

    const repository = new D1WorkEntryRepository(fakeDb);
    const updated = await repository.update("we-1", {
      title: "Reparación de PC",
    });

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe("Reparación de PC");
    expect(updated?.description).toBe("Cambio de pantalla");
    expect(updated?.createdAt.getTime()).toBe(1700000000 * 1000);
    expect(updated?.updatedAt).toBeInstanceOf(Date);
  });

  it("returns null when updating a non-existent work entry", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1WorkEntryRepository(fakeDb);
    const result = await repository.update("nonexistent", { title: "X" });
    expect(result).toBeNull();
  });

  it("allows setting description to null explicitly", async () => {
    const existingRow = {
      id: "we-1",
      business_id: "biz-1",
      title: "Reparación de laptop",
      description: "Cambio de pantalla",
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

    const repository = new D1WorkEntryRepository(fakeDb);
    const updated = await repository.update("we-1", { description: null });

    expect(updated?.description).toBeNull();
  });

  it("deletes an existing work entry and returns true", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true, meta: { changes: 1 } }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1WorkEntryRepository(fakeDb);
    const deleted = await repository.delete("we-1");
    expect(deleted).toBe(true);
  });

  it("returns false when deleting a non-existent work entry", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true, meta: { changes: 0 } }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1WorkEntryRepository(fakeDb);
    const deleted = await repository.delete("nonexistent");
    expect(deleted).toBe(false);
  });
});
