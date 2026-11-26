import { ChangePlan } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/change-plan";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/infrastructure/memory/billing/in-memory-subscription-repository";
import { InMemoryBusinessRepository } from "@aqui-suena/api/infrastructure/memory/directory/in-memory-business-repository";
import { InMemoryPlanRepository } from "@aqui-suena/api/infrastructure/memory/plans/in-memory-plan-repository";
import { ConflictError } from "@aqui-suena/api/shared/domain-error";
import { FakeSubscriptionNotifier } from "@aqui-suena/api/testing/notifiers";
import { plans } from "@aqui-suena/api/testing/plan-fixtures";
import { describe, expect, it } from "vitest";

describe("ChangePlan", () => {
  it("upgrades immediately: closes current and creates new active subscription", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo });

    const current = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );
    const newSub = await service.execute(current.id, "trades");

    expect(newSub.planId).toBe("trades");
    expect(newSub.status).toBe("active");

    const oldSub = await subRepo.getById(current.id);
    expect(oldSub?.status).toBe("expired");
  });

  it("chains an upgrade period from the previous end, clamping at month-end", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo });

    const current = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-01-31T12:00:00Z"),
    );

    const newSub = await service.execute(current.id, "trades", {
      now: new Date("2026-01-15T00:00:00Z"),
    });

    expect(newSub.endsAt?.toISOString()).toBe("2026-02-28T12:00:00.000Z");
  });

  it("upgrades a cancelled subscription that still has paid time", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo });

    const current = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-02-01T00:00:00Z"),
    );
    await subRepo.updateStatus(current.id, "cancelled");

    const newSub = await service.execute(current.id, "trades", {
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
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo });

    const current = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-02-01T00:00:00Z"),
    );
    await subRepo.updateStatus(current.id, "cancelled");

    await expect(
      service.execute(current.id, "trades", { now: new Date("2026-02-02T00:00:00Z") }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects changing plan at exactly the end of the paid period", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo });

    const current = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-02-01T00:00:00Z"),
    );
    await subRepo.updateStatus(current.id, "cancelled");

    await expect(
      service.execute(current.id, "trades", { now: new Date("2026-02-01T00:00:00Z") }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("downgrades: marks current as cancelled (stays active until endsAt)", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo });

    const current = await subRepo.create(
      "acc-1",
      "commerce",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );
    const result = await service.execute(current.id, "trades");

    expect(result.status).toBe("cancelled");
    expect(result.planId).toBe("commerce");

    const updated = await subRepo.getById(current.id);
    expect(updated?.status).toBe("cancelled");
  });

  it("downgrades at month-end with the next period clamped to the target month", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo });

    const current = await subRepo.create(
      "acc-1",
      "commerce",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-01-31T12:00:00Z"),
    );

    await service.execute(current.id, "trades", {
      now: new Date("2026-01-10T00:00:00Z"),
    });

    const next = (await subRepo.listByAccount("acc-1")).find((sub) => sub.planId === "trades");

    expect(next?.startedAt.toISOString()).toBe("2026-01-31T12:00:00.000Z");
    expect(next?.endsAt?.toISOString()).toBe("2026-02-28T12:00:00.000Z");
  });

  it("chains an annual upgrade by one year", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo });

    const current = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2027-01-01T00:00:00Z"),
      "annual",
    );

    const newSub = await service.execute(current.id, "trades", {
      now: new Date("2026-06-01T00:00:00Z"),
    });

    expect(newSub.billingInterval).toBe("annual");
    expect(newSub.endsAt?.toISOString()).toBe("2028-01-01T00:00:00.000Z");
  });

  it("schedules an annual downgrade one year out", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo });

    const current = await subRepo.create(
      "acc-1",
      "commerce",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2027-01-01T00:00:00Z"),
      "annual",
    );

    await service.execute(current.id, "trades", {
      now: new Date("2026-06-01T00:00:00Z"),
    });

    const next = (await subRepo.listByAccount("acc-1")).find((sub) => sub.planId === "trades");

    expect(next?.billingInterval).toBe("annual");
    expect(next?.startedAt.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(next?.endsAt?.toISOString()).toBe("2028-01-01T00:00:00.000Z");
  });

  it("throws when subscription not found", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo });

    await expect(service.execute("non-existent", "trades")).rejects.toThrow(
      "Subscription not found",
    );
  });

  it("throws when subscription is not active", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo });

    const sub = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );
    await subRepo.updateStatus(sub.id, "cancelled");

    await expect(service.execute(sub.id, "trades")).rejects.toThrow("not active");
  });

  it("throws when new plan does not exist", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo });

    const sub = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await expect(service.execute(sub.id, "non-existent" as PlanId)).rejects.toThrow(
      "Plan not found",
    );
  });

  it("throws when changing to the same plan", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo });

    const sub = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await expect(service.execute(sub.id, "community")).rejects.toThrow("Already on this plan");
  });

  it("downgrade schedules the new plan for the end of the period", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo });

    const current = await subRepo.create(
      "acc-1",
      "commerce",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.execute(current.id, "trades");

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
    const service = new ChangePlan({
      subscriptions: subRepo,
      plans: planRepo,
      businesses: businessRepo,
    });

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

    await service.execute(current.id, "trades", { visibleBusinessIds: [keep.id], now });

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
    const service = new ChangePlan({
      subscriptions: subRepo,
      plans: planRepo,
      businesses: businessRepo,
    });

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
      service.execute(current.id, "community", { visibleBusinessIds: [b1.id, b2.id], now }),
    ).rejects.toThrow(/UPGRADE_REQUIRED/);

    // Nothing should have been hidden because validation fails before mutation.
    expect((await businessRepo.getById(b1.id))?.hiddenAt).toBeNull();
    expect((await businessRepo.getById(b2.id))?.hiddenAt).toBeNull();
  });
});

describe("ChangePlan notification", () => {
  async function createCommerceSubscription(repo: InMemorySubscriptionRepository) {
    return repo.create("acc-1", "commerce", new Date("2026-01-01"), new Date("2026-02-01"));
  }

  it("notifies the owner on downgrade", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const notifier = new FakeSubscriptionNotifier();
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo, notifier });
    const current = await createCommerceSubscription(subRepo);

    await service.execute(current.id, "trades", {
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
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo, notifier });
    const current = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.execute(current.id, "trades", {
      now: new Date("2026-01-15"),
      recipientEmail: "owner@example.com",
    });

    expect(notifier.calls).toHaveLength(0);
  });

  it("does not notify when no notifier is injected", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo });
    const current = await createCommerceSubscription(subRepo);

    await expect(
      service.execute(current.id, "trades", {
        now: new Date("2026-01-15"),
        recipientEmail: "owner@example.com",
      }),
    ).resolves.toBeDefined();
  });

  it("does not notify without a recipient email", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const notifier = new FakeSubscriptionNotifier();
    const service = new ChangePlan({ subscriptions: subRepo, plans: planRepo, notifier });
    const current = await createCommerceSubscription(subRepo);

    await service.execute(current.id, "trades", { now: new Date("2026-01-15") });

    expect(notifier.calls).toHaveLength(0);
  });
});
