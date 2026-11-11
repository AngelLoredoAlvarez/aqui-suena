import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { SubscriptionService } from "@aqui-suena/api/domain/billing/subscriptions/subscription-service";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { ENTITLEMENTS } from "@aqui-suena/api/domain/plans/entitlements";
import type { Plan } from "@aqui-suena/api/domain/plans/plans";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { ConflictError, NotFoundError } from "@aqui-suena/api/shared/domain-error";
import { FakeSubscriptionNotifier } from "@aqui-suena/api/testing/notifiers";
import { describe, expect, it } from "vitest";

const communityPlan: Plan = {
  id: "community",
  name: "Comunidad",
  audience: "Presencia básica.",
  description: "Sin costo.",
  benefits: ["Contacto directo"],
  priceMonthly: 0,
  priceAnnual: 0,
  currency: "MXN",
  active: true,
  entitlements: ENTITLEMENTS.community,
};

const tradesPlan: Plan = {
  id: "trades",
  name: "Oficios & Servicios",
  audience: "Servicios profesionales.",
  description: "Perfil profesional.",
  benefits: ["Hasta 30 servicios"],
  priceMonthly: 4900,
  priceAnnual: 49000,
  currency: "MXN",
  active: true,
  entitlements: ENTITLEMENTS.trades,
};

const commercePlan: Plan = {
  id: "commerce",
  name: "Comercios & Catálogo",
  audience: "Negocios establecidos.",
  description: "Vitrina digital.",
  benefits: ["Hasta 50 productos"],
  priceMonthly: 9900,
  priceAnnual: 99000,
  currency: "MXN",
  active: true,
  entitlements: ENTITLEMENTS.commerce,
};

const plans = [communityPlan, tradesPlan, commercePlan];

describe("SubscriptionService.changePlan", () => {
  it("upgrades immediately: closes current and creates new active subscription", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const current = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );
    const newSub = await service.changePlan(current.id, "trades");

    expect(newSub.planId).toBe("trades");
    expect(newSub.status).toBe("active");

    const oldSub = await subRepo.getById(current.id);
    expect(oldSub?.status).toBe("expired");
  });

  it("chains an upgrade period from the previous end, clamping at month-end", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const current = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-01-31T12:00:00Z"),
    );

    const newSub = await service.changePlan(current.id, "trades", {
      now: new Date("2026-01-15T00:00:00Z"),
    });

    expect(newSub.endsAt?.toISOString()).toBe("2026-02-28T12:00:00.000Z");
  });

  it("upgrades a cancelled subscription that still has paid time", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const current = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-02-01T00:00:00Z"),
    );
    await subRepo.updateStatus(current.id, "cancelled");

    const newSub = await service.changePlan(current.id, "trades", {
      now: new Date("2026-01-15T00:00:00Z"),
    });

    expect(newSub.planId).toBe("trades");
    expect(newSub.status).toBe("active");
    expect(newSub.startedAt.toISOString()).toBe("2026-01-15T00:00:00.000Z");
    expect(newSub.endsAt?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });

  it("rejects changing plan when the cancellation already passed its paid period", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const current = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-02-01T00:00:00Z"),
    );
    await subRepo.updateStatus(current.id, "cancelled");

    await expect(
      service.changePlan(current.id, "trades", { now: new Date("2026-02-02T00:00:00Z") }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects changing plan at exactly the end of the paid period", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const current = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-02-01T00:00:00Z"),
    );
    await subRepo.updateStatus(current.id, "cancelled");

    await expect(
      service.changePlan(current.id, "trades", { now: new Date("2026-02-01T00:00:00Z") }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("downgrades: marks current as cancelled (stays active until endsAt)", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const current = await subRepo.create(
      "acc-1",
      "commerce",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );
    const result = await service.changePlan(current.id, "trades");

    expect(result.status).toBe("cancelled");
    expect(result.planId).toBe("commerce");

    const updated = await subRepo.getById(current.id);
    expect(updated?.status).toBe("cancelled");
  });

  it("downgrades at month-end with the next period clamped to the target month", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const current = await subRepo.create(
      "acc-1",
      "commerce",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-01-31T12:00:00Z"),
    );

    await service.changePlan(current.id, "trades", {
      now: new Date("2026-01-10T00:00:00Z"),
    });

    const next = (await subRepo.listByAccount("acc-1")).find((sub) => sub.planId === "trades");

    expect(next?.startedAt.toISOString()).toBe("2026-01-31T12:00:00.000Z");
    expect(next?.endsAt?.toISOString()).toBe("2026-02-28T12:00:00.000Z");
  });

  it("throws when subscription not found", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    await expect(service.changePlan("non-existent", "trades")).rejects.toThrow(
      "Subscription not found",
    );
  });

  it("throws when subscription is not active", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const sub = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );
    await subRepo.updateStatus(sub.id, "cancelled");

    await expect(service.changePlan(sub.id, "trades")).rejects.toThrow("not active");
  });

  it("throws when new plan does not exist", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const sub = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await expect(service.changePlan(sub.id, "non-existent" as PlanId)).rejects.toThrow(
      "Plan not found",
    );
  });

  it("throws when changing to the same plan", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const sub = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await expect(service.changePlan(sub.id, "community")).rejects.toThrow("Already on this plan");
  });

  it("downgrade schedules the new plan for the end of the period", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const current = await subRepo.create(
      "acc-1",
      "commerce",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.changePlan(current.id, "trades");

    // During the paid period, the old plan remains in effect.
    const during = await subRepo.getActive("acc-1", new Date("2026-01-15"));
    expect(during?.planId).toBe("commerce");

    // When the period ends, the new plan takes effect.
    const after = await subRepo.getActive("acc-1", new Date("2026-02-15"));
    expect(after?.planId).toBe("trades");
    expect(after?.status).toBe("active");
  });

  it("hides excess businesses on downgrade and retains them for 90 days", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const businessRepo = new InMemoryBusinessRepository([]);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo, businessRepo });

    const current = await subRepo.create(
      "acc-1",
      "commerce",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    const keep = await businessRepo.create({
      accountId: "acc-1",
      name: "Keep",
      category: "food",
      phone: null,
      email: null,
      address: null,
      timezone: "UTC",
      delivery: false,
    });

    const hide1 = await businessRepo.create({
      accountId: "acc-1",
      name: "Hide1",
      category: "food",
      phone: null,
      email: null,
      address: null,
      timezone: "UTC",
      delivery: false,
    });

    const hide2 = await businessRepo.create({
      accountId: "acc-1",
      name: "Hide2",
      category: "food",
      phone: null,
      email: null,
      address: null,
      timezone: "UTC",
      delivery: false,
    });

    const now = new Date("2026-01-15T00:00:00Z");

    await service.changePlan(current.id, "trades", { visibleBusinessIds: [keep.id], now });

    const kept = await businessRepo.getByIdForOwner(keep.id);
    const h1 = await businessRepo.getByIdForOwner(hide1.id);
    const h2 = await businessRepo.getByIdForOwner(hide2.id);

    expect(kept?.hiddenAt).toBeNull();
    expect(kept?.retainedUntil).toBeNull();
    expect(h1?.hiddenAt?.toISOString()).toBe(now.toISOString());
    expect(h2?.hiddenAt?.toISOString()).toBe(now.toISOString());

    const expectedRetention = new Date(now);
    expectedRetention.setDate(expectedRetention.getDate() + 90);

    expect(h1?.retainedUntil?.toISOString()).toBe(expectedRetention.toISOString());
    expect(h2?.retainedUntil?.toISOString()).toBe(expectedRetention.toISOString());
  });

  it("rejects selecting more visible businesses than the new plan allows", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const businessRepo = new InMemoryBusinessRepository([]);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo, businessRepo });

    const current = await subRepo.create(
      "acc-1",
      "commerce",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    const b1 = await businessRepo.create({
      accountId: "acc-1",
      name: "B1",
      category: "food",
      phone: null,
      email: null,
      address: null,
      timezone: "UTC",
      delivery: false,
    });

    const b2 = await businessRepo.create({
      accountId: "acc-1",
      name: "B2",
      category: "food",
      phone: null,
      email: null,
      address: null,
      timezone: "UTC",
      delivery: false,
    });

    // trades cap = 3, so 2 visibles is fine; community cap = 1, so 2 visibles must fail.
    const now = new Date("2026-01-15T00:00:00Z");

    await expect(
      service.changePlan(current.id, "community", { visibleBusinessIds: [b1.id, b2.id], now }),
    ).rejects.toThrow(/UPGRADE_REQUIRED/);

    // Nothing should have been hidden because validation fails before mutation.
    expect((await businessRepo.getById(b1.id))?.hiddenAt).toBeNull();
    expect((await businessRepo.getById(b2.id))?.hiddenAt).toBeNull();
  });
});

describe("SubscriptionService.cancel", () => {
  it("marks subscription as cancelled without creating new one", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );
    await service.cancel(sub.id);

    const cancelled = await subRepo.getById(sub.id);
    expect(cancelled?.status).toBe("cancelled");

    const all = await subRepo.listByAccount("acc-1");
    expect(all).toHaveLength(1);
  });

  it("is idempotent: a second cancel does not throw or re-notify", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const notifier = new FakeSubscriptionNotifier();
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo, notifier });

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-02-01T00:00:00Z"),
    );

    await service.cancel(sub.id, { recipientEmail: "owner@example.com" });

    await service.cancel(sub.id, { recipientEmail: "owner@example.com" });

    const cancelled = await subRepo.getById(sub.id);

    expect(cancelled?.status).toBe("cancelled");
    expect(notifier.calls).toHaveLength(1);

    const all = await subRepo.listByAccount("acc-1");

    expect(all).toHaveLength(1);
  });

  it("throws when subscription not found", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    await expect(service.cancel("non-existent")).rejects.toThrow("Subscription not found");
  });
});

describe("SubscriptionService.subscribe", () => {
  it("cancels any existing active subscription before creating the new one", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const first = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    const second = await service.subscribe(
      "acc-1",
      "trades",
      new Date("2026-01-15"),
      new Date("2026-02-15"),
    );

    expect(second.planId).toBe("trades");
    expect(second.status).toBe("active");

    const firstAfter = await subRepo.getById(first.id);
    expect(firstAfter?.status).toBe("cancelled");

    const active = await subRepo.getActive("acc-1", new Date("2026-01-20"));
    expect(active?.id).toBe(second.id);
  });

  it("reactivates a cancelled same-plan subscription instead of creating a second one", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const current = await subRepo.create(
      "acc-1",
      "commerce",
      new Date("2025-12-01T00:00:00Z"),
      new Date("2026-02-01T00:00:00Z"),
    );

    await subRepo.updateStatus(current.id, "cancelled");

    const resumed = await service.subscribe(
      "acc-1",
      "commerce",
      new Date("2026-01-15T00:00:00Z"),
      new Date("2026-02-15T00:00:00Z"),
    );

    expect(resumed.id).toBe(current.id);
    expect(resumed.status).toBe("active");
    expect(resumed.endsAt?.toISOString()).toBe("2026-03-01T00:00:00.000Z");

    const commerceRows = (await subRepo.listByAccount("acc-1")).filter(
      (sub) => sub.planId === "commerce",
    );

    expect(commerceRows).toHaveLength(1);
  });

  it("creates a subscription when none exists", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const sub = await service.subscribe(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    expect(sub.planId).toBe("community");
    expect(sub.status).toBe("active");
  });
});

describe("SubscriptionService.failRenewal", () => {
  it("marks the subscription as grace with a 7-day deadline", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    const failedAt = new Date("2026-02-01T00:00:00Z");

    await service.failRenewal(sub.id, failedAt);

    const updated = await subRepo.getById(sub.id);
    expect(updated?.status).toBe("grace");
    expect(updated?.graceEnd?.toISOString()).toBe("2026-02-08T00:00:00.000Z");
  });

  it("throws when the subscription does not exist", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    await expect(service.failRenewal("non-existent", new Date())).rejects.toThrow(
      "Subscription not found",
    );
  });
});

describe("SubscriptionService.downgradeExpiredGrace", () => {
  it("does not downgrade while still in the grace window", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"));

    const result = await service.downgradeExpiredGrace(sub.id, "community", {
      now: new Date("2026-02-05T00:00:00Z"),
    });

    expect(result).toBeNull();
    expect((await subRepo.getById(sub.id))?.status).toBe("grace");
  });

  it("downgrades once the grace window has expired", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"));

    const result = await service.downgradeExpiredGrace(sub.id, "community", {
      now: new Date("2026-02-10T00:00:00Z"),
    });

    expect(result).not.toBeNull();
    expect(result?.planId).toBe("community");
    expect(result?.status).toBe("active");
    expect((await subRepo.getById(sub.id))?.status).toBe("cancelled");
  });

  it("clamps the new period at month-end after the grace window expires", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-01-20T00:00:00Z"),
    );

    await service.failRenewal(sub.id, new Date("2026-01-20T00:00:00Z"));

    const result = await service.downgradeExpiredGrace(sub.id, "community", {
      now: new Date("2026-01-31T12:00:00Z"),
    });

    expect(result?.endsAt?.toISOString()).toBe("2026-02-28T12:00:00.000Z");
  });

  it("returns null for a non-grace subscription", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    const result = await service.downgradeExpiredGrace(sub.id, "community", {
      now: new Date("2026-02-10T00:00:00Z"),
    });

    expect(result).toBeNull();
  });
});

describe("SubscriptionService.failRenewal notification", () => {
  function setup() {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const notifier = new FakeSubscriptionNotifier();
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo, notifier });

    return { subRepo, notifier, service };
  }

  async function createActiveSubscription(repo: InMemorySubscriptionRepository) {
    return repo.create("acc-1", "trades", new Date("2026-01-01"), new Date("2026-02-01"));
  }

  it("notifies the owner when a recipient email is provided", async () => {
    const { subRepo, notifier, service } = setup();
    const sub = await createActiveSubscription(subRepo);

    await service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"), {
      recipientEmail: "owner@example.com",
    });

    expect(notifier.calls).toHaveLength(1);
    expect(notifier.calls[0]).toMatchObject({
      event: "renewal-failed",
      recipient: { email: "owner@example.com", locale: "es-MX" },
      data: { graceEnd: new Date("2026-02-08T00:00:00.000Z") },
    });
  });

  it("does not notify without a recipient email", async () => {
    const { subRepo, notifier, service } = setup();
    const sub = await createActiveSubscription(subRepo);

    await service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"));

    expect(notifier.calls).toHaveLength(0);
  });

  it("does not notify when no notifier is injected", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });
    const sub = await createActiveSubscription(subRepo);

    await expect(
      service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"), {
        recipientEmail: "owner@example.com",
      }),
    ).resolves.toBeUndefined();
  });
});

describe("SubscriptionService.changePlan notification", () => {
  async function createCommerceSubscription(repo: InMemorySubscriptionRepository) {
    return repo.create("acc-1", "commerce", new Date("2026-01-01"), new Date("2026-02-01"));
  }

  it("notifies the owner on downgrade", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const notifier = new FakeSubscriptionNotifier();
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo, notifier });
    const current = await createCommerceSubscription(subRepo);

    await service.changePlan(current.id, "trades", {
      now: new Date("2026-01-15"),
      recipientEmail: "owner@example.com",
    });

    expect(notifier.calls).toHaveLength(1);
    expect(notifier.calls[0]).toMatchObject({
      event: "plan-downgraded",
      recipient: { email: "owner@example.com", locale: "es-MX" },
      data: { planName: "Oficios & Servicios" },
    });
  });

  it("does not notify on upgrade", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const notifier = new FakeSubscriptionNotifier();
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo, notifier });
    const current = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.changePlan(current.id, "trades", {
      now: new Date("2026-01-15"),
      recipientEmail: "owner@example.com",
    });

    expect(notifier.calls).toHaveLength(0);
  });

  it("does not notify when no notifier is injected", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });
    const current = await createCommerceSubscription(subRepo);

    await expect(
      service.changePlan(current.id, "trades", {
        now: new Date("2026-01-15"),
        recipientEmail: "owner@example.com",
      }),
    ).resolves.toBeDefined();
  });

  it("does not notify without a recipient email", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const notifier = new FakeSubscriptionNotifier();
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo, notifier });
    const current = await createCommerceSubscription(subRepo);

    await service.changePlan(current.id, "trades", { now: new Date("2026-01-15") });

    expect(notifier.calls).toHaveLength(0);
  });
});

describe("SubscriptionService.downgradeExpiredGrace notification", () => {
  it("notifies the owner when the grace window expires", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const notifier = new FakeSubscriptionNotifier();
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo, notifier });
    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"), {
      recipientEmail: "owner@example.com",
    });

    await service.downgradeExpiredGrace(sub.id, "community", {
      now: new Date("2026-02-10T00:00:00Z"),
      recipientEmail: "owner@example.com",
    });

    expect(notifier.calls.map((call) => call.event)).toEqual(["renewal-failed", "grace-expired"]);
    expect(notifier.calls[1]).toMatchObject({
      event: "grace-expired",
      data: { planName: "Comunidad" },
    });
  });

  it("does not notify without a recipient email", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const notifier = new FakeSubscriptionNotifier();
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo, notifier });
    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"), {
      recipientEmail: "owner@example.com",
    });

    await service.downgradeExpiredGrace(sub.id, "community", {
      now: new Date("2026-02-10T00:00:00Z"),
    });

    expect(notifier.calls.map((call) => call.event)).toEqual(["renewal-failed"]);
  });
});

describe("SubscriptionService.cancel notification", () => {
  it("notifies the owner with the plan name and active-until date", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const notifier = new FakeSubscriptionNotifier();
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo, notifier });
    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.cancel(sub.id, { recipientEmail: "owner@example.com" });

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
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo, notifier });
    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.cancel(sub.id);

    expect(notifier.calls).toHaveLength(0);
  });
});

describe("SubscriptionService error types", () => {
  it("throws NotFoundError when the subscription is missing", async () => {
    const service = new SubscriptionService({
      subscriptionRepo: new InMemorySubscriptionRepository(),
      planRepo: new InMemoryPlanRepository(plans),
    });

    await expect(service.cancel("non-existent")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws ConflictError when the subscription is not active", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const service = new SubscriptionService({
      subscriptionRepo: subRepo,
      planRepo: new InMemoryPlanRepository(plans),
    });
    const sub = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );
    await subRepo.updateStatus(sub.id, "cancelled");

    await expect(service.changePlan(sub.id, "trades")).rejects.toBeInstanceOf(ConflictError);
  });
});
