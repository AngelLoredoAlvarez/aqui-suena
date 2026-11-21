import { DatabaseSync } from "node:sqlite";
import { DeleteAccount } from "@aqui-suena/api/domain/accounts/delete-account";
import type { UserDirectory } from "@aqui-suena/api/domain/accounts/user-directory";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { D1AccountRepository } from "@aqui-suena/api/infrastructure/accounts/d1-account-repository";
import { D1BusinessRepository } from "@aqui-suena/api/infrastructure/directory/d1-business-repository";
import { D1MediaRepository } from "@aqui-suena/api/infrastructure/media/d1-media-repository";
import { describe, expect, it } from "vitest";

const DDL = `
  CREATE TABLE accounts (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL,
    plan_id TEXT DEFAULT 'community' NOT NULL,
    rfc TEXT, legal_name TEXT, tax_regime TEXT, tax_zip_code TEXT, cfdi_use TEXT,
    billing_email TEXT, tax_data_updated_at INTEGER, deleted_at INTEGER,
    conekta_customer_id TEXT, default_card_source_id TEXT, card_brand TEXT,
    card_last4 TEXT, card_exp_month INTEGER, card_exp_year INTEGER,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  );

  CREATE UNIQUE INDEX accounts_email_unique ON accounts (email);

  CREATE TABLE account_preferences (
    account_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    locale TEXT DEFAULT 'es-MX' NOT NULL,
    renewal_reminders_enabled INTEGER DEFAULT 1 NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE businesses (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    name TEXT NOT NULL, category TEXT NOT NULL,
    phone TEXT, email TEXT, address TEXT, timezone TEXT NOT NULL,
    delivery INTEGER NOT NULL DEFAULT 0, hidden_at INTEGER, retained_until INTEGER,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  );

  CREATE TABLE products (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL, description TEXT, price INTEGER NOT NULL, created_at INTEGER NOT NULL
  );

  CREATE TABLE media (
    id TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT NOT NULL REFERENCES accounts(id),
    business_id TEXT REFERENCES businesses(id),
    kind TEXT NOT NULL, r2_key TEXT NOT NULL, mime TEXT NOT NULL,
    size INTEGER NOT NULL, created_at INTEGER NOT NULL
  );

  CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    plan_id TEXT NOT NULL, status TEXT DEFAULT 'active' NOT NULL,
    started_at INTEGER NOT NULL, ends_at INTEGER, grace_end INTEGER,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  );

  CREATE TABLE payments (
    id TEXT PRIMARY KEY NOT NULL,
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
    amount INTEGER NOT NULL, currency TEXT DEFAULT 'MXN' NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL, paid_at INTEGER,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, plan_id TEXT
  );

  CREATE TABLE cfdi_invoices (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    payment_id TEXT, status TEXT NOT NULL, uuid TEXT, provider_id TEXT,
    xml_key TEXT, failure_reason TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
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

function count(database: DatabaseSync, table: string): number {
  const row = database.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get() as { total: number };

  return row.total;
}

function seed(database: DatabaseSync): void {
  const now = 1_700_000_000;

  const insert = (sql: string, ...values: Array<string | number | null>) =>
    database.prepare(sql).run(...values);

  insert(
    `INSERT INTO accounts (id, email, plan_id, rfc, legal_name, tax_regime,
       tax_zip_code, cfdi_use, billing_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    "acc-1",
    "owner@example.com",
    "trades",
    "EKU9003173C9",
    "ESCUELA KEMPER URGARTE",
    "601",
    "42501",
    "G03",
    "facturas@example.com",
    now,
    now,
  );

  insert(
    `INSERT INTO businesses (id, account_id, name, category, timezone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    "b1",
    "acc-1",
    "Tacos",
    "food",
    "UTC",
    now,
    now,
  );

  insert(
    `INSERT INTO businesses (id, account_id, name, category, timezone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    "b2",
    "acc-1",
    "Jugos",
    "food",
    "UTC",
    now,
    now,
  );

  insert(
    "INSERT INTO products (id, business_id, name, price, created_at) VALUES (?, ?, ?, ?, ?)",
    "p1",
    "b1",
    "Taco",
    25,
    now,
  );

  insert(
    `INSERT INTO media (id, owner_id, kind, r2_key, mime, size, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    "m1",
    "acc-1",
    "avatar",
    "avatar/acc-1/m1",
    "image/png",
    70,
    now,
  );

  insert(
    `INSERT INTO media (id, owner_id, kind, r2_key, mime, size, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    "m2",
    "acc-1",
    "flyer",
    "flyer/acc-1/m2",
    "image/png",
    80,
    now,
  );

  insert(
    `INSERT INTO subscriptions (id, account_id, plan_id, status, started_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    "sub-1",
    "acc-1",
    "trades",
    "active",
    now,
    now,
    now,
  );

  insert(
    `INSERT INTO payments (id, subscription_id, amount, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    "pay-1",
    "sub-1",
    29900,
    "paid",
    now,
    now,
  );

  insert(
    `INSERT INTO cfdi_invoices (id, account_id, status, uuid, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    "cfdi-1",
    "acc-1",
    "issued",
    "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
    now,
    now,
  );
}

function setup() {
  const database = new DatabaseSync(":memory:");

  database.exec(DDL);

  seed(database);

  const db = createD1Adapter(database);

  const deletedObjects: string[] = [];

  const storage: ObjectStorage = {
    presignUpload: async () => ({ key: "k", uploadUrl: "https://example.test/k" }),
    signedUrl: async () => "https://example.test/signed",
    head: async () => null,
    delete: async (key) => {
      deletedObjects.push(key);
    },
  };

  const users: UserDirectory = { deleteUser: async () => undefined };

  const accounts = new D1AccountRepository(db);

  const deleteAccount = new DeleteAccount({
    accounts,
    users,
    media: new D1MediaRepository(db),
    storage,
    businesses: new D1BusinessRepository(db),
  });

  return { database, accounts, deleteAccount, deletedObjects };
}

describe("account deletion against real SQLite", () => {
  it("purges what is personal, keeps what the law requires, and frees the email", async () => {
    const { database, deleteAccount, deletedObjects } = setup();

    await deleteAccount.execute("acc-1");

    expect(count(database, "businesses")).toBe(0);
    expect(count(database, "products")).toBe(0);
    expect(count(database, "media")).toBe(0);
    expect(deletedObjects).toEqual(["avatar/acc-1/m1", "flyer/acc-1/m2"]);
    expect(count(database, "subscriptions")).toBe(1);
    expect(count(database, "payments")).toBe(1);
    expect(count(database, "cfdi_invoices")).toBe(1);

    const accountsRow = database
      .prepare("SELECT email, plan_id, rfc, billing_email, deleted_at FROM accounts WHERE id = ?")
      .get("acc-1") as {
      email: string;
      plan_id: string;
      rfc: string | null;
      billing_email: string | null;
      deleted_at: number | null;
    };

    expect(accountsRow.email).toBe("deleted-acc-1@deleted.invalid");
    expect(accountsRow.plan_id).toBe("trades");
    expect(accountsRow.rfc).toBeNull();
    expect(accountsRow.billing_email).toBeNull();
    expect(accountsRow.deleted_at).not.toBeNull();

    const invoice = database
      .prepare("SELECT account_id FROM cfdi_invoices WHERE id = ?")
      .get("cfdi-1") as { account_id: string };

    expect(invoice.account_id).toBe("acc-1");
  });

  it("lets the freed email provision a brand-new account", async () => {
    const { database, accounts, deleteAccount } = setup();

    await deleteAccount.execute("acc-1");

    await accounts.ensure("acc-new", "owner@example.com");

    const rows = database
      .prepare("SELECT id, email, deleted_at FROM accounts ORDER BY id")
      .all() as Array<{ id: string; email: string; deleted_at: number | null }>;

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      id: "acc-1",
      email: "deleted-acc-1@deleted.invalid",
      deleted_at: expect.any(Number),
    });
    expect(rows[1]).toEqual({ id: "acc-new", email: "owner@example.com", deleted_at: null });
  });
});
