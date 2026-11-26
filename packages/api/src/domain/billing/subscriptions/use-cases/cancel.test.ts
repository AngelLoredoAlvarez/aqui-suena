import { plans } from "@aqui-suena/api/domain/billing/subscriptions/fixtures";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/model/subscription";
import { CancelSubscription } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/cancel";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { FakeSubscriptionNotifier } from "@aqui-suena/api/testing/notifiers";
import { describe, expect, it } from "vitest";

describe("CancelSubscription", () => {
  it("marks subscription as cancelled without creating new one", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new CancelSubscription({ subscriptions: subRepo, plans: planRepo });

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );
    await service.execute(sub.id);

    const cancelled = await subRepo.getById(sub.id);
    expect(cancelled?.status).toBe("cancelled");

    const all = await subRepo.listByAccount("acc-1");
    expect(all).toHaveLength(1);
  });

  it("is idempotent: a second cancel does not throw or re-notify", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const notifier = new FakeSubscriptionNotifier();
    const service = new CancelSubscription({ subscriptions: subRepo, plans: planRepo, notifier });

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-02-01T00:00:00Z"),
    );

    await service.execute(sub.id, { recipientEmail: "owner@example.com" });

    await service.execute(sub.id, { recipientEmail: "owner@example.com" });

    const cancelled = await subRepo.getById(sub.id);

    expect(cancelled?.status).toBe("cancelled");
    expect(notifier.calls).toHaveLength(1);

    const all = await subRepo.listByAccount("acc-1");

    expect(all).toHaveLength(1);
  });

  it("cancels a grace subscription", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new CancelSubscription({ subscriptions: subRepo, plans: planRepo });

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-02-01T00:00:00Z"),
    );

    await subRepo.enterGrace(sub.id, new Date("2026-02-08T00:00:00Z"));

    await service.execute(sub.id);

    const cancelled = await subRepo.getById(sub.id);

    expect(cancelled?.status).toBe("cancelled");
  });

  it("treats an expired subscription as already cancelled", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new CancelSubscription({ subscriptions: subRepo, plans: planRepo });

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-02-01T00:00:00Z"),
    );

    await subRepo.updateStatus(sub.id, "expired");

    await service.execute(sub.id);

    const still = await subRepo.getById(sub.id);

    expect(still?.status).toBe("expired");
  });

  it("throws when subscription not found", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new CancelSubscription({ subscriptions: subRepo, plans: planRepo });

    await expect(service.execute("non-existent")).rejects.toThrow("Subscription not found");
  });
});

describe("CancelSubscription notification", () => {
  it("notifies the owner with the plan name and active-until date", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const notifier = new FakeSubscriptionNotifier();
    const service = new CancelSubscription({ subscriptions: subRepo, plans: planRepo, notifier });
    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.execute(sub.id, { recipientEmail: "owner@example.com" });

    expect(notifier.calls).toHaveLength(1);
    expect(notifier.calls[0]).toMatchObject({
      event: "cancelled",
      recipient: { email: "owner@example.com", locale: "es-MX" },
      data: { planName: "Oficios & Servicios", activeUntil: new Date("2026-02-01") },
    });
  });

  it("does not notify without a recipient email", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const notifier = new FakeSubscriptionNotifier();
    const service = new CancelSubscription({ subscriptions: subRepo, plans: planRepo, notifier });
    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.execute(sub.id);

    expect(notifier.calls).toHaveLength(0);
  });

  it("notifies a grace cancellation with no active-until date", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const notifier = new FakeSubscriptionNotifier();
    const service = new CancelSubscription({ subscriptions: subRepo, plans: planRepo, notifier });

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-02-01T00:00:00Z"),
    );
    await subRepo.enterGrace(sub.id, new Date("2026-02-08T00:00:00Z"));

    await service.execute(sub.id, { recipientEmail: "owner@example.com" });

    expect(notifier.calls).toHaveLength(1);
    expect(notifier.calls[0]).toMatchObject({
      event: "cancelled",
      recipient: { email: "owner@example.com", locale: "es-MX" },
      data: { planName: "Oficios & Servicios", activeUntil: null },
    });
  });
});
