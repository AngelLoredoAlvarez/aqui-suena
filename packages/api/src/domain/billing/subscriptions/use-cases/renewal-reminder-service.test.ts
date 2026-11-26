import { RenewalReminderService } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/renewal-reminder-service";
import { InMemoryReminderLogRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-reminder-log-repository";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-subscription-repository";
import { FakeSubscriptionNotifier } from "@aqui-suena/api/testing/notifiers";
import { describe, expect, it } from "vitest";

const ENDS_AT = new Date("2026-02-08T00:00:00Z");

function setup() {
  const subRepo = new InMemorySubscriptionRepository();
  const reminderLog = new InMemoryReminderLogRepository();
  const notifier = new FakeSubscriptionNotifier();
  const service = new RenewalReminderService({
    subscriptionRepo: subRepo,
    reminderLog,
    notifier,
  });

  return { subRepo, reminderLog, notifier, service };
}

function createSubscription(repo: InMemorySubscriptionRepository) {
  return repo.create("acc-1", "trades", new Date("2026-01-01"), ENDS_AT);
}

describe("RenewalReminderService", () => {
  it("notifies the 7-day reminder when due", async () => {
    const { subRepo, notifier, service } = setup();
    const sub = await createSubscription(subRepo);

    const sent = await service.processSubscription(sub.id, {
      now: new Date("2026-02-01T00:00:00Z"),
      recipientEmail: "owner@example.com",
    });

    expect(sent).toEqual(["renewal_7d"]);
    expect(notifier.calls).toEqual([
      {
        event: "renewal-upcoming",
        recipient: { email: "owner@example.com", locale: "es-MX" },
        data: { daysBefore: 7, renewalDate: ENDS_AT },
      },
    ]);
  });

  it("notifies the 1-day reminder when due", async () => {
    const { subRepo, notifier, service } = setup();
    const sub = await createSubscription(subRepo);

    const sent = await service.processSubscription(sub.id, {
      now: new Date("2026-02-07T00:00:00Z"),
      recipientEmail: "owner@example.com",
    });

    expect(sent).toEqual(["renewal_1d"]);
    expect(notifier.calls).toEqual([
      {
        event: "renewal-upcoming",
        recipient: { email: "owner@example.com", locale: "es-MX" },
        data: { daysBefore: 1, renewalDate: ENDS_AT },
      },
    ]);
  });

  it("does not notify when no reminder is due", async () => {
    const { subRepo, notifier, service } = setup();
    const sub = await createSubscription(subRepo);

    const sent = await service.processSubscription(sub.id, {
      now: new Date("2026-01-20T00:00:00Z"),
      recipientEmail: "owner@example.com",
    });

    expect(sent).toEqual([]);
    expect(notifier.calls).toHaveLength(0);
  });

  it("does not notify when the reminder was already sent", async () => {
    const { subRepo, reminderLog, notifier, service } = setup();
    const sub = await createSubscription(subRepo);

    await reminderLog.record(sub.id, "renewal_7d", ENDS_AT, new Date("2026-02-01"));

    const sent = await service.processSubscription(sub.id, {
      now: new Date("2026-02-01T00:00:00Z"),
      recipientEmail: "owner@example.com",
    });

    expect(sent).toEqual([]);
    expect(notifier.calls).toHaveLength(0);
  });

  it("does not notify when reminders are disabled", async () => {
    const { subRepo, notifier, service } = setup();
    const sub = await createSubscription(subRepo);

    const sent = await service.processSubscription(sub.id, {
      now: new Date("2026-02-01T00:00:00Z"),
      recipientEmail: "owner@example.com",
      preferences: { renewalRemindersEnabled: false },
    });

    expect(sent).toEqual([]);
    expect(notifier.calls).toHaveLength(0);
  });

  it("returns empty for a non-existent subscription", async () => {
    const { notifier, service } = setup();

    const sent = await service.processSubscription("non-existent", {
      now: new Date("2026-02-01T00:00:00Z"),
      recipientEmail: "owner@example.com",
    });

    expect(sent).toEqual([]);
    expect(notifier.calls).toHaveLength(0);
  });

  it("records the sent reminder in the log", async () => {
    const { subRepo, reminderLog, service } = setup();
    const sub = await createSubscription(subRepo);

    await service.processSubscription(sub.id, {
      now: new Date("2026-02-01T00:00:00Z"),
      recipientEmail: "owner@example.com",
    });

    expect(await reminderLog.sentAt(sub.id, "renewal_7d", ENDS_AT)).toBeDefined();
  });

  it("sends the reminders again for the next billing period after a renewal", async () => {
    const { subRepo, notifier, service } = setup();
    const sub = await createSubscription(subRepo);
    const nextEndsAt = new Date("2026-03-08T00:00:00Z");

    await service.processSubscription(sub.id, {
      now: new Date("2026-02-01T00:00:00Z"),
      recipientEmail: "owner@example.com",
    });
    await service.processSubscription(sub.id, {
      now: new Date("2026-02-07T00:00:00Z"),
      recipientEmail: "owner@example.com",
    });

    await subRepo.renew(sub.id, nextEndsAt, "monthly");

    const sevenDay = await service.processSubscription(sub.id, {
      now: new Date("2026-03-01T00:00:00Z"),
      recipientEmail: "owner@example.com",
    });
    const oneDay = await service.processSubscription(sub.id, {
      now: new Date("2026-03-07T00:00:00Z"),
      recipientEmail: "owner@example.com",
    });

    expect(sevenDay).toEqual(["renewal_7d"]);
    expect(oneDay).toEqual(["renewal_1d"]);
    expect(notifier.calls).toHaveLength(4);
  });
});
