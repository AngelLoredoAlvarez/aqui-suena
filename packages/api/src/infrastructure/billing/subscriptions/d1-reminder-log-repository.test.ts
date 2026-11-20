import { D1ReminderLogRepository } from "@aqui-suena/api/infrastructure/billing/subscriptions/d1-reminder-log-repository";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { normalizeSql } from "@aqui-suena/api/testing/sql";
import { describe, expect, it } from "vitest";

describe("D1ReminderLogRepository", () => {
  it("reads the types already sent for a subscription", async () => {
    const fake = new FakeD1Database(() => ({
      all: [{ type: "renewal_7d" }, { type: "renewal_1d" }],
    }));
    const repo = new D1ReminderLogRepository(fake.db);

    expect(await repo.sentTypes("sub-1")).toEqual(new Set(["renewal_7d", "renewal_1d"]));
    expect(normalizeSql(fake.statements[0]?.sql)).toContain("subscription_id = ?");
    expect(fake.statements[0]?.params).toEqual(["sub-1"]);
  });

  it("records a reminder with an idempotent insert", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repo = new D1ReminderLogRepository(fake.db);
    const sentAt = new Date("2026-11-19T12:00:00Z");

    await repo.record("sub-1", "renewal_7d", sentAt);

    const sql = normalizeSql(fake.statements[0]?.sql);

    expect(sql).toContain("INSERT INTO subscription_reminders");
    expect(sql).toContain("ON CONFLICT(subscription_id, type) DO NOTHING");
    expect(fake.statements[0]?.params).toEqual([
      expect.any(String),
      "sub-1",
      "renewal_7d",
      Math.floor(sentAt.getTime() / 1000),
    ]);
  });

  it("checks whether a reminder was sent", async () => {
    const fake = new FakeD1Database((statement) =>
      statement.sql.includes("SELECT 1 AS sent") ? { first: { sent: 1 } } : { first: null },
    );
    const repo = new D1ReminderLogRepository(fake.db);

    expect(await repo.hasSent("sub-1", "renewal_1d")).toBe(true);
    expect(normalizeSql(fake.statements[0]?.sql)).toContain("subscription_id = ? AND type = ?");
  });

  it("returns the sent timestamp", async () => {
    const fake = new FakeD1Database(() => ({ first: { sent_at: 1700000000 } }));
    const repo = new D1ReminderLogRepository(fake.db);

    expect(await repo.sentAt("sub-1", "renewal_7d")).toEqual(new Date(1700000000 * 1000));
  });

  it("rejects an unknown reminder type", async () => {
    const fake = new FakeD1Database(() => ({ all: [{ type: "renewal_30d" }] }));
    const repo = new D1ReminderLogRepository(fake.db);

    await expect(repo.sentTypes("sub-1")).rejects.toBeInstanceOf(DataIntegrityError);
  });
});
