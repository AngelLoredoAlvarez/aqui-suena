import { D1FlyerRepository } from "@aqui-suena/api/infrastructure/directory/d1-flyer-repository";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

const sampleRow = {
  id: "fly-1",
  business_id: "biz-1",
  url: "https://example.com/flyer.jpg",
  replaced_at: 1700000000,
  created_at: 1700000000,
  updated_at: 1700000000,
};

describe("D1FlyerRepository", () => {
  it("maps D1 rows into flyers", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repository = new D1FlyerRepository(fake.db);

    const page = await repository.list({ limit: 20, cursor: null });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("fly-1");
    expect(page.items[0]?.businessId).toBe("biz-1");
    expect(page.items[0]?.url).toBe("https://example.com/flyer.jpg");
    expect(page.items[0]?.replacedAt).toBeInstanceOf(Date);
    expect(page.items[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("returns null when getById finds nothing", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repository = new D1FlyerRepository(fake.db);

    expect(await repository.getById("nonexistent")).toBeNull();
  });

  it("lists only flyers belonging to the given business", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repository = new D1FlyerRepository(fake.db);

    const flyers = await repository.listByBusiness("biz-1");

    expect(flyers).toHaveLength(1);
    expect(flyers[0]?.businessId).toBe("biz-1");
  });

  it("creates a flyer and returns it with generated id and timestamps", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repository = new D1FlyerRepository(fake.db);

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
    const fake = new FakeD1Database(({ sql }) => {
      if (sql.includes("WHERE id = ?")) return { first: sampleRow };

      return { run: { success: true } };
    });
    const repository = new D1FlyerRepository(fake.db);

    const updated = await repository.update("fly-1", { url: "https://example.com/new.jpg" });

    expect(updated).not.toBeNull();
    expect(updated?.url).toBe("https://example.com/new.jpg");
    expect(updated?.replacedAt.getTime()).toBeGreaterThan(1700000000 * 1000);
    expect(updated?.createdAt.getTime()).toBe(1700000000 * 1000);
    expect(updated?.updatedAt).toBeInstanceOf(Date);
  });

  it("returns null when updating a non-existent flyer", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repository = new D1FlyerRepository(fake.db);

    expect(await repository.update("nonexistent", { url: "https://example.com/x.jpg" })).toBeNull();
  });

  it("deletes an existing flyer and returns true", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 1 } }));
    const repository = new D1FlyerRepository(fake.db);

    expect(await repository.delete("fly-1")).toBe(true);
  });

  it("returns false when deleting a non-existent flyer", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 0 } }));
    const repository = new D1FlyerRepository(fake.db);

    expect(await repository.delete("nonexistent")).toBe(false);
  });
});
