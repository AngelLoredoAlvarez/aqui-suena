import { D1ProductRepository } from "@aqui-suena/api/infrastructure/directory/d1-product-repository";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

const sampleRow = {
  id: "pdct-1",
  business_id: "biz-1",
  name: "SSD Samsung 990 Pro 1TB",
  description: "Disco duro solido de alta velocidad",
  price: 10000,
  created_at: 1700000000,
};

describe("D1ProductRepository", () => {
  it("maps D1 rows into products", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repository = new D1ProductRepository(fake.db);

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
    const fake = new FakeD1Database(() => ({ first: null }));
    const repository = new D1ProductRepository(fake.db);

    expect(await repository.getById("nonexistent")).toBeNull();
  });

  it("pages products by business with deterministic order, LIMIT and OFFSET", async () => {
    const fake = new FakeD1Database();
    const repository = new D1ProductRepository(fake.db);

    await repository.listByBusiness({ businessId: "biz-1", limit: 5, offset: 10 });

    expect(fake.statements[0]?.sql).toMatch(
      /WHERE business_id = \? ORDER BY created_at, id LIMIT \? OFFSET \?/,
    );
    expect(fake.statements[0]?.params).toEqual(["biz-1", 5, 10]);
  });

  it("lists every product of a business without paging", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repository = new D1ProductRepository(fake.db);

    const products = await repository.listAllByBusiness("biz-1");

    expect(products).toHaveLength(1);
    expect(fake.statements[0]?.sql).toMatch(/WHERE business_id = \?/);
    expect(fake.statements[0]?.sql).not.toMatch(/LIMIT/);
  });

  it("creates a product and returns it with generated id and timestamps", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repository = new D1ProductRepository(fake.db);

    const product = await repository.create({
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
    const fake = new FakeD1Database(({ sql }) => {
      if (sql.includes("WHERE id = ?")) return { first: sampleRow };

      return { run: { success: true } };
    });
    const repository = new D1ProductRepository(fake.db);

    const updated = await repository.update("pdct-1", {
      name: "SSD Samsung 980 Pro 2TB",
      price: 9000,
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe("SSD Samsung 980 Pro 2TB");
    expect(updated?.price).toBe(9000);
    expect(updated?.description).toBe("Disco duro solido de alta velocidad");
    expect(updated?.createdAt.getTime()).toBe(sampleRow.created_at * 1000);
  });

  it("returns null when updating a non-existent product", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repository = new D1ProductRepository(fake.db);

    expect(await repository.update("nonexistent", { name: "X" })).toBeNull();
  });

  it("allows setting a field to null explicitly", async () => {
    const fake = new FakeD1Database(({ sql }) => {
      if (sql.includes("WHERE id = ?")) return { first: sampleRow };

      return { run: { success: true } };
    });
    const repository = new D1ProductRepository(fake.db);

    expect((await repository.update("pdct-1", { description: null }))?.description).toBeNull();
  });

  it("deletes an existing product and returns true", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 1 } }));
    const repository = new D1ProductRepository(fake.db);

    expect(await repository.delete("pdct-1")).toBe(true);
  });

  it("returns false when deleting a non-existent product", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 0 } }));
    const repository = new D1ProductRepository(fake.db);

    expect(await repository.delete("nonexistent")).toBe(false);
  });
});
