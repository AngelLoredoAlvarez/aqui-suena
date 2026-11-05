import { D1PhotoRepository } from "@aqui-suena/api/infrastructure/directory/d1-photo-repository";
import { describe, expect, it } from "vitest";

describe("D1PhotoRepository", () => {
  it("maps D1 rows into photos", async () => {
    const fakeDb = {
      prepare: () => ({
        all: async () => ({
          results: [
            {
              id: "ph-1",
              business_id: "biz-1",
              work_entry_id: "we-1",
              product_id: "pdct-1",
              kind: "product",
              url: "https://example.com/photo.jpg",
              created_at: 1700000000,
            },
          ],
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1PhotoRepository(fakeDb);
    const photos = await repository.list();

    expect(photos).toHaveLength(1);
    expect(photos[0]?.id).toBe("ph-1");
    expect(photos[0]?.businessId).toBe("biz-1");
    expect(photos[0]?.workEntryId).toBe("we-1");
    expect(photos[0]?.productId).toBe("pdct-1");
    expect(photos[0]?.kind).toBe("product");
    expect(photos[0]?.url).toBe("https://example.com/photo.jpg");
    expect(photos[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("returns null when getById finds nothing", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1PhotoRepository(fakeDb);
    const photo = await repository.getById("nonexistent");
    expect(photo).toBeNull();
  });

  it("lists only photos belonging to the given business", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({
            results: [
              {
                id: "ph-1",
                business_id: "biz-1",
                work_entry_id: null,
                product_id: null,
                kind: "logo",
                url: "https://example.com/logo.jpg",
                created_at: 1700000000,
              },
            ],
          }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1PhotoRepository(fakeDb);
    const photos = await repository.listByBusiness("biz-1");

    expect(photos).toHaveLength(1);
    expect(photos[0]?.businessId).toBe("biz-1");
  });

  it("creates a photo and returns it with generated id and timestamp", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1PhotoRepository(fakeDb);
    const photo = await repository.create({
      businessId: "biz-1",
      workEntryId: null,
      productId: "pdct-1",
      kind: "product",
      url: "https://example.com/photo.jpg",
    });

    expect(photo).not.toBeNull();
    expect(photo.id).toBeTruthy();
    expect(photo.businessId).toBe("biz-1");
    expect(photo.workEntryId).toBeNull();
    expect(photo.productId).toBe("pdct-1");
    expect(photo.kind).toBe("product");
    expect(photo.url).toBe("https://example.com/photo.jpg");
    expect(photo.createdAt).toBeInstanceOf(Date);
  });

  it("updates only the provided fields and preserves the rest", async () => {
    const existingRow = {
      id: "ph-1",
      business_id: "biz-1",
      work_entry_id: "we-1",
      product_id: "pdct-1",
      kind: "product",
      url: "https://example.com/old.jpg",
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

    const repository = new D1PhotoRepository(fakeDb);
    const updated = await repository.update("ph-1", {
      url: "https://example.com/new.jpg",
      kind: "logo",
    });

    expect(updated).not.toBeNull();
    expect(updated?.url).toBe("https://example.com/new.jpg");
    expect(updated?.kind).toBe("logo");
    expect(updated?.workEntryId).toBe("we-1");
    expect(updated?.productId).toBe("pdct-1");
    expect(updated?.createdAt.getTime()).toBe(1700000000 * 1000);
  });

  it("allows setting nullable FKs to null explicitly", async () => {
    const existingRow = {
      id: "ph-1",
      business_id: "biz-1",
      work_entry_id: "we-1",
      product_id: "pdct-1",
      kind: "product",
      url: "https://example.com/photo.jpg",
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

    const repository = new D1PhotoRepository(fakeDb);
    const updated = await repository.update("ph-1", {
      workEntryId: null,
      productId: null,
    });

    expect(updated?.workEntryId).toBeNull();
    expect(updated?.productId).toBeNull();
  });

  it("returns null when updating a non-existent photo", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1PhotoRepository(fakeDb);
    const result = await repository.update("nonexistent", { url: "https://example.com/x.jpg" });
    expect(result).toBeNull();
  });

  it("deletes an existing photo and returns true", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true, meta: { changes: 1 } }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1PhotoRepository(fakeDb);
    const deleted = await repository.delete("ph-1");
    expect(deleted).toBe(true);
  });

  it("returns false when deleting a non-existent photo", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true, meta: { changes: 0 } }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1PhotoRepository(fakeDb);
    const deleted = await repository.delete("nonexistent");
    expect(deleted).toBe(false);
  });
});
