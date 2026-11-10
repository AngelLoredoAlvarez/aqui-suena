import { DatabaseSync } from "node:sqlite";
import { D1BusinessRepository } from "@aqui-suena/api/infrastructure/directory/d1-business-repository";
import { describe, expect, it } from "vitest";

const DDL = `
  CREATE TABLE accounts (id TEXT PRIMARY KEY);
  CREATE TABLE businesses (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    timezone TEXT NOT NULL,
    delivery INTEGER NOT NULL DEFAULT 0,
    hidden_at INTEGER,
    retained_until INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE services (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    base_price INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE work_entries (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE products (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE photos (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    work_entry_id TEXT REFERENCES work_entries(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE flyers (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    replaced_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE hours (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    day INTEGER NOT NULL,
    open_minute INTEGER NOT NULL,
    close_minute INTEGER NOT NULL
  );
`;

function createD1Adapter(database: DatabaseSync): D1Database {
  return {
    prepare: (sql: string) => {
      let parameters: Array<string | number | bigint | Uint8Array | null> = [];
      const statement = {
        bind: (...values: Array<string | number | bigint | Uint8Array | null>) => {
          parameters = values;

          return statement;
        },
        all: async () => ({ results: database.prepare(sql).all(...parameters) }),
        first: async () => database.prepare(sql).get(...parameters) ?? null,
        run: async () => {
          const result = database.prepare(sql).run(...parameters);

          return { success: true, meta: { changes: Number(result.changes) } };
        },
      };

      return statement;
    },
  } as unknown as D1Database;
}

function seed(database: DatabaseSync, retainedUntil: number | null): void {
  database.prepare("INSERT INTO accounts (id) VALUES (?)").run("acc-1");
  database
    .prepare(
      `INSERT INTO businesses (
        id, account_id, name, category, phone, email, address, timezone,
        delivery, hidden_at, retained_until, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run("biz-1", "acc-1", "Tacos", "food", null, null, null, "UTC", 0, null, retainedUntil, 1, 1);
  database
    .prepare(
      "INSERT INTO products (id, business_id, name, description, price, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run("product-1", "biz-1", "Taco", null, 100, 1);
  database
    .prepare(
      "INSERT INTO work_entries (id, business_id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run("work-1", "biz-1", "Work", null, 1, 1);
  database
    .prepare(
      "INSERT INTO photos (id, business_id, work_entry_id, product_id, kind, url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run("photo-1", "biz-1", "work-1", "product-1", "product", "https://r2/photo.jpg", 1);
  database
    .prepare(
      "INSERT INTO services (id, business_id, name, description, base_price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run("service-1", "biz-1", "Service", null, null, 1, 1);
  database
    .prepare(
      "INSERT INTO flyers (id, business_id, url, replaced_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run("flyer-1", "biz-1", "https://r2/flyer.jpg", 1, 1, 1);
  database
    .prepare(
      "INSERT INTO hours (id, business_id, day, open_minute, close_minute) VALUES (?, ?, ?, ?, ?)",
    )
    .run("hour-1", "biz-1", 1, 0, 60);
}

function count(database: DatabaseSync, table: string): number {
  const row = database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as
    | { count: number }
    | undefined;

  return Number(row?.count ?? 0);
}

function expectEverythingDeleted(database: DatabaseSync): void {
  for (const table of [
    "businesses",
    "products",
    "photos",
    "services",
    "work_entries",
    "flyers",
    "hours",
  ]) {
    expect(count(database, table)).toBe(0);
  }
}

describe("D1BusinessRepository cascade deletion", () => {
  it("deleteExpired removes the business and every child", async () => {
    const database = new DatabaseSync(":memory:");
    database.exec("PRAGMA foreign_keys = ON");
    database.exec(DDL);
    seed(database, 1);
    const repository = new D1BusinessRepository(createD1Adapter(database));

    const deleted = await repository.deleteExpired(new Date(2000));

    expect(deleted).toBe(1);
    expectEverythingDeleted(database);
  });

  it("manual delete removes the business and every child", async () => {
    const database = new DatabaseSync(":memory:");
    database.exec("PRAGMA foreign_keys = ON");
    database.exec(DDL);
    seed(database, null);
    const repository = new D1BusinessRepository(createD1Adapter(database));

    const deleted = await repository.delete("biz-1");

    expect(deleted).toBe(true);
    expectEverythingDeleted(database);
  });
});
