import { D1PhotoRepository } from "@aqui-suena/api/infrastructure/directory/d1-photo-repository";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

const sampleRow = {
  id: "ph-1",
  business_id: "biz-1",
  work_entry_id: "we-1",
  product_id: "pdct-1",
  kind: "product",
  url: "https://example.com/photo.jpg",
  created_at: 1700000000,
};

describe("D1PhotoRepository", () => {
  it("maps D1 rows into photos", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repository = new D1PhotoRepository(fake.db);

    const page = await repository.listByBusiness({ businessId: "biz-1", limit: 20, offset: 0 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("ph-1");
    expect(page.items[0]?.businessId).toBe("biz-1");
    expect(page.items[0]?.workEntryId).toBe("we-1");
    expect(page.items[0]?.productId).toBe("pdct-1");
    expect(page.items[0]?.kind).toBe("product");
    expect(page.items[0]?.url).toBe("https://example.com/photo.jpg");
    expect(page.items[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("returns null when getById finds nothing", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repository = new D1PhotoRepository(fake.db);

    expect(await repository.getById("nonexistent")).toBeNull();
  });

  it("lists only photos belonging to the given business", async () => {
    const fake = new FakeD1Database(() => ({
      all: [{ ...sampleRow, work_entry_id: null, product_id: null, kind: "logo" }],
    }));
    const repository = new D1PhotoRepository(fake.db);

    const page = await repository.listByBusiness({ businessId: "biz-1", limit: 20, offset: 0 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.businessId).toBe("biz-1");
  });

  it("creates a photo and returns it with generated id and timestamp", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repository = new D1PhotoRepository(fake.db);

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
    const fake = new FakeD1Database(({ sql }) => {
      if (sql.includes("WHERE id = ?")) return { first: sampleRow };

      return { run: { success: true } };
    });
    const repository = new D1PhotoRepository(fake.db);

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
    const fake = new FakeD1Database(({ sql }) => {
      if (sql.includes("WHERE id = ?")) return { first: sampleRow };

      return { run: { success: true } };
    });
    const repository = new D1PhotoRepository(fake.db);

    const updated = await repository.update("ph-1", { workEntryId: null, productId: null });

    expect(updated?.workEntryId).toBeNull();
    expect(updated?.productId).toBeNull();
  });

  it("returns null when updating a non-existent photo", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repository = new D1PhotoRepository(fake.db);

    expect(await repository.update("nonexistent", { url: "https://example.com/x.jpg" })).toBeNull();
  });

  it("deletes an existing photo and returns true", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 1 } }));
    const repository = new D1PhotoRepository(fake.db);

    expect(await repository.delete("ph-1")).toBe(true);
  });

  it("returns false when deleting a non-existent photo", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 0 } }));
    const repository = new D1PhotoRepository(fake.db);

    expect(await repository.delete("nonexistent")).toBe(false);
  });
});
