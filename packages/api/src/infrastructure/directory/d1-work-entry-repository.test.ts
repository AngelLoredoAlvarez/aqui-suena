import { D1WorkEntryRepository } from "@aqui-suena/api/infrastructure/directory/d1-work-entry-repository";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

const sampleRow = {
  id: "we-1",
  business_id: "biz-1",
  title: "Reparación de laptop",
  description: "Cambio de pantalla",
  created_at: 1700000000,
  updated_at: 1700000000,
};

describe("D1WorkEntryRepository", () => {
  it("maps D1 rows into work entries", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repository = new D1WorkEntryRepository(fake.db);

    const page = await repository.listByBusiness({ businessId: "biz-1", limit: 20, offset: 0 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("we-1");
    expect(page.items[0]?.businessId).toBe("biz-1");
    expect(page.items[0]?.title).toBe("Reparación de laptop");
    expect(page.items[0]?.description).toBe("Cambio de pantalla");
    expect(page.items[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("returns null when getById finds nothing", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repository = new D1WorkEntryRepository(fake.db);

    expect(await repository.getById("nonexistent")).toBeNull();
  });

  it("lists only work entries belonging to the given business", async () => {
    const fake = new FakeD1Database(() => ({ all: [{ ...sampleRow, description: null }] }));
    const repository = new D1WorkEntryRepository(fake.db);

    const page = await repository.listByBusiness({ businessId: "biz-1", limit: 20, offset: 0 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.businessId).toBe("biz-1");
  });

  it("creates a work entry and returns it with generated id and timestamps", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repository = new D1WorkEntryRepository(fake.db);

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
    const fake = new FakeD1Database(({ sql }) => {
      if (sql.includes("WHERE id = ?")) return { first: sampleRow };

      return { run: { success: true } };
    });
    const repository = new D1WorkEntryRepository(fake.db);

    const updated = await repository.update("we-1", { title: "Reparación de PC" });

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe("Reparación de PC");
    expect(updated?.description).toBe("Cambio de pantalla");
    expect(updated?.createdAt.getTime()).toBe(1700000000 * 1000);
    expect(updated?.updatedAt).toBeInstanceOf(Date);
  });

  it("returns null when updating a non-existent work entry", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repository = new D1WorkEntryRepository(fake.db);

    expect(await repository.update("nonexistent", { title: "X" })).toBeNull();
  });

  it("allows setting description to null explicitly", async () => {
    const fake = new FakeD1Database(({ sql }) => {
      if (sql.includes("WHERE id = ?")) return { first: sampleRow };

      return { run: { success: true } };
    });
    const repository = new D1WorkEntryRepository(fake.db);

    expect((await repository.update("we-1", { description: null }))?.description).toBeNull();
  });

  it("deletes an existing work entry and returns true", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 1 } }));
    const repository = new D1WorkEntryRepository(fake.db);

    expect(await repository.delete("we-1")).toBe(true);
  });

  it("returns false when deleting a non-existent work entry", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 0 } }));
    const repository = new D1WorkEntryRepository(fake.db);

    expect(await repository.delete("nonexistent")).toBe(false);
  });
});
