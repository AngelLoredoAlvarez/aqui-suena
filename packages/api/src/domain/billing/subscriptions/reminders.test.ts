import {
  dueReminders,
  InMemoryReminderLogRepository,
  type ReminderType,
} from "@aqui-suena/api/domain/billing/subscriptions/reminders";
import type { Subscription } from "@aqui-suena/api/domain/billing/subscriptions/subscriptions";
import { describe, expect, it } from "vitest";

const activeSub: Subscription = {
  id: "sub-1",
  accountId: "acc-1",
  planId: "trades",
  status: "active",
  startedAt: new Date("2026-01-01"),
  endsAt: new Date("2026-02-08T00:00:00Z"),
  graceEnd: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

describe("dueReminders", () => {
  it("returns empty when subscription is not active", () => {
    const sub = { ...activeSub, status: "cancelled" as const };

    const result = dueReminders(sub, new Date("2026-02-01"), new Set(), {
      renewalRemindersEnabled: true,
    });

    expect(result).toEqual([]);
  });

  it("returns empty when endsAt is null", () => {
    const sub = { ...activeSub, endsAt: null };

    const result = dueReminders(sub, new Date("2026-02-01"), new Set(), {
      renewalRemindersEnabled: true,
    });

    expect(result).toEqual([]);
  });

  it("returns empty when already expired", () => {
    const result = dueReminders(activeSub, new Date("2026-02-10"), new Set(), {
      renewalRemindersEnabled: true,
    });

    expect(result).toEqual([]);
  });

  it("returns renewal_7d when 7 days before expiry", () => {
    const result = dueReminders(activeSub, new Date("2026-02-01"), new Set(), {
      renewalRemindersEnabled: true,
    });

    expect(result).toEqual(["renewal_7d"]);
  });

  it("returns renewal_7d when 2-6 days before expiry", () => {
    const result = dueReminders(activeSub, new Date("2026-02-04"), new Set(), {
      renewalRemindersEnabled: true,
    });

    expect(result).toEqual(["renewal_7d"]);
  });

  it("returns renewal_1d when 1 day before expiry", () => {
    const result = dueReminders(activeSub, new Date("2026-02-07"), new Set(), {
      renewalRemindersEnabled: true,
    });

    expect(result).toEqual(["renewal_1d"]);
  });

  it("returns renewal_1d when on expiry day", () => {
    const result = dueReminders(activeSub, new Date("2026-02-08"), new Set(), {
      renewalRemindersEnabled: true,
    });

    expect(result).toEqual(["renewal_1d"]);
  });

  it("returns empty when renewalRemindersEnabled is false", () => {
    const result = dueReminders(activeSub, new Date("2026-02-01"), new Set(), {
      renewalRemindersEnabled: false,
    });

    expect(result).toEqual([]);
  });

  it("does not return renewal_7d when already sent", () => {
    const sent = new Set<ReminderType>(["renewal_7d"]);

    const result = dueReminders(activeSub, new Date("2026-02-01"), sent, {
      renewalRemindersEnabled: true,
    });

    expect(result).toEqual([]);
  });

  it("does not return renewal_1d when already sent", () => {
    const sent = new Set<ReminderType>(["renewal_1d"]);

    const result = dueReminders(activeSub, new Date("2026-02-07"), sent, {
      renewalRemindersEnabled: true,
    });

    expect(result).toEqual([]);
  });
});

describe("InMemoryReminderLogRepository", () => {
  it("hasSent returns false initially", async () => {
    const repo = new InMemoryReminderLogRepository();

    expect(await repo.hasSent("sub-1", "renewal_7d")).toBe(false);
  });

  it("record marks a reminder as sent with timestamp", async () => {
    const repo = new InMemoryReminderLogRepository();
    const sentAt = new Date("2026-02-01T10:00:00Z");

    await repo.record("sub-1", "renewal_7d", sentAt);

    expect(await repo.hasSent("sub-1", "renewal_7d")).toBe(true);
    expect(await repo.sentAt("sub-1", "renewal_7d")).toEqual(sentAt);
  });

  it("sentTypes returns empty set initially", async () => {
    const repo = new InMemoryReminderLogRepository();
    const types = await repo.sentTypes("sub-1");

    expect(types.size).toBe(0);
  });

  it("sentTypes returns recorded types", async () => {
    const repo = new InMemoryReminderLogRepository();

    await repo.record("sub-1", "renewal_7d", new Date());
    await repo.record("sub-1", "renewal_1d", new Date());

    const types = await repo.sentTypes("sub-1");

    expect(types.has("renewal_7d")).toBe(true);
    expect(types.has("renewal_1d")).toBe(true);
  });

  it("tracks per subscription independently", async () => {
    const repo = new InMemoryReminderLogRepository();

    await repo.record("sub-1", "renewal_7d", new Date());

    expect(await repo.hasSent("sub-2", "renewal_7d")).toBe(false);
  });

  it("sentAt returns undefined for unsent reminder", async () => {
    const repo = new InMemoryReminderLogRepository();

    expect(await repo.sentAt("sub-1", "renewal_7d")).toBeUndefined();
  });
});
