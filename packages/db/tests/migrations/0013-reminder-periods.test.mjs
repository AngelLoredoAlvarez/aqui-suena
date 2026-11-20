import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { apply, migrationFiles } from "./support.mjs";

const TARGET = "0013_purple_jetstream.sql";

describe("migration 0013", () => {
  it("backfills each reminder with the period it belongs to", () => {
    const database = new DatabaseSync(":memory:");

    apply(
      database,
      migrationFiles().filter((file) => file < TARGET),
    );
    database.exec(`
      INSERT INTO plans (
        id, name, audience, description, benefits,
        price_monthly, price_annual, currency, active, created_at, updated_at
      ) VALUES ('trades', 'Trades', 'business', 'Trades', '[]', 0, 0, 'MXN', 1, 1, 1);
      INSERT INTO accounts (id, email, plan_id, created_at, updated_at)
      VALUES
        ('acc-1', 'one@example.com', 'trades', 1, 1),
        ('acc-2', 'two@example.com', 'trades', 1, 1);
      INSERT INTO subscriptions (
        id, account_id, plan_id, billing_interval, status,
        started_at, ends_at, grace_end, created_at, updated_at
      ) VALUES
        ('sub-1', 'acc-1', 'trades', 'monthly', 'active', 1, 2000000000, NULL, 1, 1),
        ('sub-2', 'acc-2', 'trades', 'monthly', 'active', 1, NULL, NULL, 1, 1);
      INSERT INTO subscription_reminders (id, subscription_id, type, sent_at)
      VALUES
        ('rem-1', 'sub-1', 'renewal_7d', 1990000000),
        ('rem-2', 'sub-2', 'renewal_1d', 1234);
    `);

    apply(database, [TARGET]);

    const periods = database
      .prepare("SELECT id, period_ends_at FROM subscription_reminders ORDER BY id")
      .all()
      .map((row) => [row.id, row.period_ends_at]);

    expect(periods).toEqual([
      ["rem-1", 2000000000],
      ["rem-2", 1234],
    ]);

    const column = database
      .prepare("PRAGMA table_info(subscription_reminders)")
      .all()
      .find((entry) => entry.name === "period_ends_at");

    expect(column?.notnull).toBe(1);

    const index = database
      .prepare("PRAGMA index_info(subscription_reminders_subscription_type_period_unique)")
      .all()
      .map((entry) => entry.name);

    expect(index).toEqual(["subscription_id", "type", "period_ends_at"]);
    expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(() =>
      database
        .prepare(
          "INSERT INTO subscription_reminders VALUES ('dup', 'sub-1', 'renewal_7d', 2000000000, 1)",
        )
        .run(),
    ).toThrow(/UNIQUE constraint failed/);
    expect(() =>
      database
        .prepare(
          "INSERT INTO subscription_reminders (id, subscription_id, type, sent_at) VALUES ('missing', 'sub-1', 'renewal_1d', 1)",
        )
        .run(),
    ).toThrow(/NOT NULL constraint failed/);
  });

  it("applies to an empty table and to the full migration chain", () => {
    const database = new DatabaseSync(":memory:");

    apply(database, migrationFiles());

    const count = database.prepare("SELECT COUNT(*) AS count FROM subscription_reminders").get();

    expect(count?.count).toBe(0);
    expect(
      database
        .prepare("PRAGMA table_info(subscription_reminders)")
        .all()
        .map((entry) => entry.name),
    ).toEqual(["id", "subscription_id", "type", "period_ends_at", "sent_at"]);
    expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
});
