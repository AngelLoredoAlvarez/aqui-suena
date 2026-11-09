import { FakeEmailSender } from "@aqui-suena/api/domain/billing/email";
import { InMemoryReminderLogRepository } from "@aqui-suena/api/domain/billing/reminders";
import { RenewalReminderService } from "@aqui-suena/api/domain/billing/renewal-reminder-service";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions";
import { describe, expect, it } from "vitest";

describe("RenewalReminderService", () => {
  it("sends 7-day reminder when due", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const emailSender = new FakeEmailSender();
    const reminderLog = new InMemoryReminderLogRepository();
    const service = new RenewalReminderService(subRepo, emailSender, reminderLog);

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-08T00:00:00Z"),
    );

    const sent = await service.processSubscription(
      sub.id,
      new Date("2026-02-01T00:00:00Z"),
      "owner@example.com",
    );

    expect(sent).toEqual(["renewal_7d"]);
    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]?.subject).toContain("7 días");
    expect(await reminderLog.hasSent(sub.id, "renewal_7d")).toBe(true);
  });

  it("sends 1-day reminder when due", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const emailSender = new FakeEmailSender();
    const reminderLog = new InMemoryReminderLogRepository();
    const service = new RenewalReminderService(subRepo, emailSender, reminderLog);

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-08T00:00:00Z"),
    );

    const sent = await service.processSubscription(
      sub.id,
      new Date("2026-02-07T00:00:00Z"),
      "owner@example.com",
    );

    expect(sent).toEqual(["renewal_1d"]);
    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]?.subject).toContain("mañana");
  });

  it("does not send when no reminder is due", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const emailSender = new FakeEmailSender();
    const reminderLog = new InMemoryReminderLogRepository();
    const service = new RenewalReminderService(subRepo, emailSender, reminderLog);

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-08T00:00:00Z"),
    );

    const sent = await service.processSubscription(
      sub.id,
      new Date("2026-01-20T00:00:00Z"),
      "owner@example.com",
    );

    expect(sent).toEqual([]);
    expect(emailSender.sent).toHaveLength(0);
  });

  it("does not send when already sent", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const emailSender = new FakeEmailSender();
    const reminderLog = new InMemoryReminderLogRepository();
    const service = new RenewalReminderService(subRepo, emailSender, reminderLog);

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-08T00:00:00Z"),
    );

    await reminderLog.record(sub.id, "renewal_7d", new Date("2026-02-01"));

    const sent = await service.processSubscription(
      sub.id,
      new Date("2026-02-01T00:00:00Z"),
      "owner@example.com",
    );

    expect(sent).toEqual([]);
    expect(emailSender.sent).toHaveLength(0);
  });

  it("does not send when reminders are disabled", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const emailSender = new FakeEmailSender();
    const reminderLog = new InMemoryReminderLogRepository();
    const service = new RenewalReminderService(subRepo, emailSender, reminderLog);

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-08T00:00:00Z"),
    );

    const sent = await service.processSubscription(
      sub.id,
      new Date("2026-02-01T00:00:00Z"),
      "owner@example.com",
      { renewalRemindersEnabled: false },
    );

    expect(sent).toEqual([]);
    expect(emailSender.sent).toHaveLength(0);
  });

  it("returns empty for non-existent subscription", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const emailSender = new FakeEmailSender();
    const reminderLog = new InMemoryReminderLogRepository();
    const service = new RenewalReminderService(subRepo, emailSender, reminderLog);

    const sent = await service.processSubscription(
      "non-existent",
      new Date("2026-02-01T00:00:00Z"),
      "owner@example.com",
    );

    expect(sent).toEqual([]);
    expect(emailSender.sent).toHaveLength(0);
  });

  it("records sent reminder in the log", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const emailSender = new FakeEmailSender();
    const reminderLog = new InMemoryReminderLogRepository();
    const service = new RenewalReminderService(subRepo, emailSender, reminderLog);

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-08T00:00:00Z"),
    );

    await service.processSubscription(
      sub.id,
      new Date("2026-02-01T00:00:00Z"),
      "owner@example.com",
    );

    const sentAt = await reminderLog.sentAt(sub.id, "renewal_7d");

    expect(sentAt).toBeDefined();
  });
});
