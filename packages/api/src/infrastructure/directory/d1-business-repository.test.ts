import { D1BusinessRepository } from "@aqui-suena/api/infrastructure/directory/d1-business-repository";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

const sampleRow = {
  id: "biz-1",
  account_id: "acc-1",
  name: "Tacos El Güero",
  category: "food",
  phone: "+521234567890",
  email: "tacos@example.com",
  address: "Calle Falsa 123",
  timezone: "America/Mexico_City",
  delivery: 1,
  hidden_at: null,
  retained_until: null,
  created_at: 1700000000,
  updated_at: 1700000000,
};

describe("D1BusinessRepository", () => {
  it("maps D1 rows into businesses", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repository = new D1BusinessRepository(fake.db);

    const page = await repository.list({ limit: 20, cursor: null });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("biz-1");
    expect(page.items[0]?.accountId).toBe("acc-1");
    expect(page.items[0]?.name).toBe("Tacos El Güero");
    expect(page.items[0]?.category).toBe("food");
    expect(page.items[0]?.delivery).toBe(true);
    expect(page.items[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("throws DataIntegrityError when a stored category is unknown", async () => {
    const fake = new FakeD1Database(() => ({
      all: [{ ...sampleRow, category: "restaurant" }],
    }));
    const repository = new D1BusinessRepository(fake.db);

    await expect(repository.list({ limit: 20, cursor: null })).rejects.toBeInstanceOf(
      DataIntegrityError,
    );
  });

  it("returns null when getById finds nothing", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repository = new D1BusinessRepository(fake.db);

    expect(await repository.getById("nonexistent")).toBeNull();
  });

  it("pages the account's businesses with LIMIT and OFFSET", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repository = new D1BusinessRepository(fake.db);

    const page = await repository.listByAccount({ accountId: "acc-1", limit: 5, offset: 10 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.accountId).toBe("acc-1");
    expect(page).toMatchObject({ limit: 5, offset: 10 });
    expect(fake.statements[0]?.sql).toMatch(
      /WHERE account_id = \? ORDER BY created_at, id LIMIT \? OFFSET \?/,
    );
    expect(fake.statements[0]?.params).toEqual(["acc-1", 5, 10]);
  });

  it("lists every business of the account without paging", async () => {
    const fake = new FakeD1Database();
    const repository = new D1BusinessRepository(fake.db);

    expect(await repository.listAllByAccount("acc-1")).toEqual([]);
    expect(fake.statements[0]?.sql).toMatch(/WHERE account_id = \?/);
    expect(fake.statements[0]?.sql).not.toMatch(/LIMIT/);
  });

  it("creates a business and returns it with generated id and timestamps", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repository = new D1BusinessRepository(fake.db);

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
    const fake = new FakeD1Database(({ sql }) => {
      if (sql.includes("WHERE id = ?")) return { first: sampleRow };

      return { run: { success: true } };
    });
    const repository = new D1BusinessRepository(fake.db);

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
    const fake = new FakeD1Database(() => ({ first: null }));
    const repository = new D1BusinessRepository(fake.db);

    expect(await repository.update("nonexistent", { name: "X" })).toBeNull();
  });

  it("allows setting a field to null explicitly", async () => {
    const fake = new FakeD1Database(({ sql }) => {
      if (sql.includes("WHERE id = ?")) return { first: sampleRow };

      return { run: { success: true } };
    });
    const repository = new D1BusinessRepository(fake.db);

    expect((await repository.update("biz-1", { phone: null }))?.phone).toBeNull();
  });

  it("deletes an existing business and returns true", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 1 } }));
    const repository = new D1BusinessRepository(fake.db);

    expect(await repository.delete("biz-1")).toBe(true);
  });

  it("returns false when deleting a non-existent business", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 0 } }));
    const repository = new D1BusinessRepository(fake.db);

    expect(await repository.delete("nonexistent")).toBe(false);
  });
});
