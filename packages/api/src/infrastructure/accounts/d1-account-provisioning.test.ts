import { DatabaseSync } from "node:sqlite";
import { AccountEmailConflictError } from "@aqui-suena/api/domain/accounts/account-repository";
import { D1AccountRepository } from "@aqui-suena/api/infrastructure/accounts/d1-account-repository";
import { describe, expect, it } from "vitest";

const DDL = `
  CREATE TABLE accounts (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL,
    plan_id TEXT DEFAULT 'community' NOT NULL,
    rfc TEXT,
    legal_name TEXT,
    tax_regime TEXT,
    tax_zip_code TEXT,
    cfdi_use TEXT,
    billing_email TEXT,
    tax_data_updated_at INTEGER,
    conekta_customer_id TEXT,
    default_card_source_id TEXT,
    card_brand TEXT,
    card_last4 TEXT,
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE UNIQUE INDEX accounts_email_unique ON accounts (email);

  CREATE TABLE account_preferences (
    account_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    locale TEXT DEFAULT 'es-MX' NOT NULL,
    renewal_reminders_enabled INTEGER DEFAULT 1 NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE media (
    id TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT NOT NULL REFERENCES accounts(id),
    kind TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at INTEGER NOT NULL
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

function setup() {
  const database = new DatabaseSync(":memory:");

  database.exec(DDL);

  return { database, repo: new D1AccountRepository(createD1Adapter(database)) };
}

describe("account provisioning against real SQLite", () => {
  it("leaves exactly one row when two first requests race", async () => {
    const { database, repo } = setup();

    await Promise.all([
      repo.ensure("acc-new", "owner@example.com"),
      repo.ensure("acc-new", "owner@example.com"),
    ]);

    const row = database.prepare("SELECT COUNT(*) AS total FROM accounts").get() as {
      total: number;
    };

    expect(row.total).toBe(1);
  });

  it("refuses an email owned by another account and names the owner", async () => {
    const { database, repo } = setup();

    database
      .prepare("INSERT INTO accounts (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)")
      .run("acc-old", "taken@example.com", 0, 0);

    const attempt = repo.ensure("acc-new", "TAKEN@example.com");

    await expect(attempt).rejects.toBeInstanceOf(AccountEmailConflictError);
    await expect(attempt).rejects.toMatchObject({ ownerId: "acc-old" });

    const row = database
      .prepare("SELECT COUNT(*) AS total FROM accounts WHERE id = ?")
      .get("acc-new") as { total: number };

    expect(row.total).toBe(0);
  });

  it("refuses to move an account onto an email another account owns", async () => {
    const { database, repo } = setup();
    const insert = database.prepare(
      "INSERT INTO accounts (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)",
    );

    insert.run("acc-old", "taken@example.com", 0, 0);
    insert.run("acc-new", "mine@example.com", 0, 0);

    const attempt = repo.ensure("acc-new", "taken@example.com");

    await expect(attempt).rejects.toBeInstanceOf(AccountEmailConflictError);
    await expect(attempt).rejects.toMatchObject({ ownerId: "acc-old" });

    const row = database.prepare("SELECT email FROM accounts WHERE id = ?").get("acc-new") as {
      email: string;
    };

    expect(row.email).toBe("mine@example.com");
  });

  it("satisfies the accounts foreign key for owned rows after provisioning", async () => {
    const { database, repo } = setup();

    await repo.ensure("acc-new", "owner@example.com");

    expect(() =>
      database
        .prepare(
          `INSERT INTO media (id, owner_id, kind, r2_key, mime, size, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run("m1", "acc-new", "avatar", "avatar/acc-new/1", "image/png", 70, 0),
    ).not.toThrow();
  });
});
