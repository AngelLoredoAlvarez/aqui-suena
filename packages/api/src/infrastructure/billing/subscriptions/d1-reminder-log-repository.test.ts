import { DatabaseSync } from "node:sqlite";
import { D1ReminderLogRepository } from "@aqui-suena/api/infrastructure/billing/subscriptions/d1-reminder-log-repository";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { normalizeSql } from "@aqui-suena/api/testing/sql";
import { describe, expect, it } from "vitest";

const PERIOD = new Date("2026-02-08T00:00:00Z");

describe("D1ReminderLogRepository", () => {
  it("reads the types already sent for one subscription period", async () => {
    const fake = new FakeD1Database(() => ({
      all: [{ type: "renewal_7d" }, { type: "renewal_1d" }],
    }));
    const repo = new D1ReminderLogRepository(fake.db);

    expect(await repo.sentTypes("sub-1", PERIOD)).toEqual(new Set(["renewal_7d", "renewal_1d"]));
    expect(normalizeSql(fake.statements[0]?.sql)).toContain(
      "subscription_id = ? AND period_ends_at = ?",
    );
    expect(fake.statements[0]?.params).toEqual(["sub-1", toEpoch(PERIOD)]);
  });

  it("records a reminder scoped to the period", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repo = new D1ReminderLogRepository(fake.db);
    const sentAt = new Date("2026-11-19T12:00:00Z");

    await repo.record("sub-1", "renewal_7d", PERIOD, sentAt);

    const sql = normalizeSql(fake.statements[0]?.sql);

    expect(sql).toContain("INSERT INTO subscription_reminders");
    expect(sql).toContain("period_ends_at");
    expect(sql).toContain("ON CONFLICT(subscription_id, type, period_ends_at) DO NOTHING");
    expect(fake.statements[0]?.params).toEqual([
      expect.any(String),
      "sub-1",
      "renewal_7d",
      toEpoch(PERIOD),
      toEpoch(sentAt),
    ]);
  });

  it("checks whether a reminder was sent for the period", async () => {
    const fake = new FakeD1Database((statement) =>
      statement.sql.includes("SELECT 1 AS sent") ? { first: { sent: 1 } } : { first: null },
    );
    const repo = new D1ReminderLogRepository(fake.db);

    expect(await repo.hasSent("sub-1", "renewal_1d", PERIOD)).toBe(true);
    expect(normalizeSql(fake.statements[0]?.sql)).toContain(
      "subscription_id = ? AND type = ? AND period_ends_at = ?",
    );
    expect(fake.statements[0]?.params).toEqual(["sub-1", "renewal_1d", toEpoch(PERIOD)]);
  });

  it("returns the sent timestamp for the period", async () => {
    const fake = new FakeD1Database(() => ({ first: { sent_at: 1700000000 } }));
    const repo = new D1ReminderLogRepository(fake.db);

    expect(await repo.sentAt("sub-1", "renewal_7d", PERIOD)).toEqual(new Date(1700000000 * 1000));
    expect(normalizeSql(fake.statements[0]?.sql)).toContain("period_ends_at = ?");
    expect(fake.statements[0]?.params).toEqual(["sub-1", "renewal_7d", toEpoch(PERIOD)]);
  });

  it("rejects an unknown reminder type", async () => {
    const fake = new FakeD1Database(() => ({ all: [{ type: "renewal_30d" }] }));
    const repo = new D1ReminderLogRepository(fake.db);

    await expect(repo.sentTypes("sub-1", PERIOD)).rejects.toBeInstanceOf(DataIntegrityError);
  });
});

const REAL_DDL = `
  CREATE TABLE subscriptions (id TEXT PRIMARY KEY);
  CREATE TABLE subscription_reminders (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    period_ends_at INTEGER NOT NULL,
    sent_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX subscription_reminders_subscription_type_period_unique
    ON subscription_reminders (subscription_id, type, period_ends_at);
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

describe("D1ReminderLogRepository real SQLite", () => {
  it("is idempotent per period and separates periods", async () => {
    const database = new DatabaseSync(":memory:");
    const first = new Date("2026-02-08T00:00:00Z");
    const second = new Date("2026-03-08T00:00:00Z");
    const sentAt = new Date("2026-02-01T10:00:00Z");

    database.exec(REAL_DDL);
    database.prepare("INSERT INTO subscriptions (id) VALUES ('sub-1')").run();

    const repo = new D1ReminderLogRepository(createD1Adapter(database));

    await repo.record("sub-1", "renewal_7d", first, sentAt);
    await repo.record("sub-1", "renewal_7d", first, new Date("2026-02-02T10:00:00Z"));

    expect(
      (database.prepare("SELECT COUNT(*) AS n FROM subscription_reminders").get() as { n: number })
        .n,
    ).toBe(1);
    expect(await repo.sentAt("sub-1", "renewal_7d", first)).toEqual(sentAt);
    expect(await repo.hasSent("sub-1", "renewal_7d", first)).toBe(true);
    expect(await repo.sentTypes("sub-1", first)).toEqual(new Set(["renewal_7d"]));

    await repo.record("sub-1", "renewal_7d", second, sentAt);
    await repo.record("sub-1", "renewal_1d", second, sentAt);

    expect(
      (database.prepare("SELECT COUNT(*) AS n FROM subscription_reminders").get() as { n: number })
        .n,
    ).toBe(3);
    expect(await repo.sentTypes("sub-1", first)).toEqual(new Set(["renewal_7d"]));
    expect(await repo.sentTypes("sub-1", second)).toEqual(new Set(["renewal_7d", "renewal_1d"]));
    expect(await repo.sentAt("sub-1", "renewal_1d", first)).toBeUndefined();
  });
});
