import type { Plan } from "@aqui-suena/api/domain/billing/plans";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/billing/plans";
import { SubscriptionService } from "@aqui-suena/api/domain/billing/subscription-service";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { PlanId } from "@aqui-suena/api/entitlements";
import { ENTITLEMENTS } from "@aqui-suena/api/entitlements";
import { describe, expect, it } from "vitest";
import { FakeEmailSender } from "./email";

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
    const service = new SubscriptionService(subRepo, planRepo);

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

  it("downgrades: marks current as cancelled (stays active until endsAt)", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService(subRepo, planRepo);

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

  it("throws when subscription not found", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService(subRepo, planRepo);

    await expect(service.changePlan("non-existent", "trades")).rejects.toThrow(
      "Subscription not found",
    );
  });

  it("throws when subscription is not active", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService(subRepo, planRepo);

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
    const service = new SubscriptionService(subRepo, planRepo);

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
    const service = new SubscriptionService(subRepo, planRepo);

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
    const service = new SubscriptionService(subRepo, planRepo);

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
    const service = new SubscriptionService(subRepo, planRepo, businessRepo);

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

    await service.changePlan(current.id, "trades", [keep.id], now);

    const kept = await businessRepo.getById(keep.id);
    const h1 = await businessRepo.getById(hide1.id);
    const h2 = await businessRepo.getById(hide2.id);

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
    const service = new SubscriptionService(subRepo, planRepo, businessRepo);

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

    await expect(service.changePlan(current.id, "community", [b1.id, b2.id], now)).rejects.toThrow(
      /UPGRADE_REQUIRED/,
    );

    // Nothing should have been hidden because validation fails before mutation.
    expect((await businessRepo.getById(b1.id))?.hiddenAt).toBeNull();
    expect((await businessRepo.getById(b2.id))?.hiddenAt).toBeNull();
  });
});

describe("SubscriptionService.cancel", () => {
  it("marks subscription as cancelled without creating new one", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService(subRepo, planRepo);

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

  it("throws when subscription not found", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService(subRepo, planRepo);

    await expect(service.cancel("non-existent")).rejects.toThrow("Subscription not found");
  });
});

describe("SubscriptionService.subscribe", () => {
  it("cancels any existing active subscription before creating the new one", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService(subRepo, planRepo);

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

  it("creates a subscription when none exists", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService(subRepo, planRepo);

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
    const service = new SubscriptionService(subRepo, planRepo);

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
    const service = new SubscriptionService(subRepo, planRepo);

    await expect(service.failRenewal("non-existent", new Date())).rejects.toThrow(
      "Subscription not found",
    );
  });
});

describe("SubscriptionService.downgradeExpiredGrace", () => {
  it("does not downgrade while still in the grace window", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService(subRepo, planRepo);

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"));

    const result = await service.downgradeExpiredGrace(
      sub.id,
      "community",
      new Date("2026-02-05T00:00:00Z"),
    );

    expect(result).toBeNull();
    expect((await subRepo.getById(sub.id))?.status).toBe("grace");
  });

  it("downgrades once the grace window has expired", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService(subRepo, planRepo);

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"));

    const result = await service.downgradeExpiredGrace(
      sub.id,
      "community",
      new Date("2026-02-10T00:00:00Z"),
    );

    expect(result).not.toBeNull();
    expect(result?.planId).toBe("community");
    expect(result?.status).toBe("active");
    expect((await subRepo.getById(sub.id))?.status).toBe("cancelled");
  });

  it("returns null for a non-grace subscription", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService(subRepo, planRepo);

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    const result = await service.downgradeExpiredGrace(
      sub.id,
      "community",
      new Date("2026-02-10T00:00:00Z"),
    );

    expect(result).toBeNull();
  });
});

describe("SubscriptionService.failRenewal with email", () => {
  it("sends a grace-period warning email when sender and email are provided", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const fakeEmail = new FakeEmailSender();
    const service = new SubscriptionService(subRepo, planRepo, undefined, fakeEmail);

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"), "owner@example.com");

    expect(fakeEmail.sent).toHaveLength(1);
    expect(fakeEmail.sent[0]?.to).toBe("owner@example.com");
    expect(fakeEmail.sent[0]?.subject).toContain("gracia");
  });

  it("does not send email when no recipient email is provided", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const fakeEmail = new FakeEmailSender();
    const service = new SubscriptionService(subRepo, planRepo, undefined, fakeEmail);

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"));

    expect(fakeEmail.sent).toHaveLength(0);
  });

  it("does not send email when no email sender is injected", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService(subRepo, planRepo);

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await expect(
      service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"), "owner@example.com"),
    ).resolves.toBeUndefined();
  });
});

describe("SubscriptionService.changePlan downgrade notification", () => {
  it("sends downgrade notification when downgrading with email", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const fakeEmail = new FakeEmailSender();
    const service = new SubscriptionService(subRepo, planRepo, undefined, fakeEmail);

    const current = await subRepo.create(
      "acc-1",
      "commerce",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.changePlan(
      current.id,
      "trades",
      undefined,
      new Date("2026-01-15"),
      "owner@example.com",
    );

    expect(fakeEmail.sent).toHaveLength(1);
    expect(fakeEmail.sent[0]?.to).toBe("owner@example.com");
    expect(fakeEmail.sent[0]?.subject).toContain("degradado");
  });

  it("does not send notification when upgrading", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const fakeEmail = new FakeEmailSender();
    const service = new SubscriptionService(subRepo, planRepo, undefined, fakeEmail);

    const current = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.changePlan(
      current.id,
      "trades",
      undefined,
      new Date("2026-01-15"),
      "owner@example.com",
    );

    expect(fakeEmail.sent).toHaveLength(0);
  });

  it("does not send notification when no emailSender", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService(subRepo, planRepo);

    const current = await subRepo.create(
      "acc-1",
      "commerce",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await expect(
      service.changePlan(
        current.id,
        "trades",
        undefined,
        new Date("2026-01-15"),
        "owner@example.com",
      ),
    ).resolves.toBeDefined();
  });

  it("does not send notification when no recipientEmail", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const fakeEmail = new FakeEmailSender();
    const service = new SubscriptionService(subRepo, planRepo, undefined, fakeEmail);

    const current = await subRepo.create(
      "acc-1",
      "commerce",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.changePlan(current.id, "trades");

    expect(fakeEmail.sent).toHaveLength(0);
  });
});

describe("SubscriptionService.downgradeExpiredGrace notification", () => {
  it("sends downgrade notification when grace expires with email", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const fakeEmail = new FakeEmailSender();
    const service = new SubscriptionService(subRepo, planRepo, undefined, fakeEmail);

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"), "owner@example.com");

    await service.downgradeExpiredGrace(
      sub.id,
      "community",
      new Date("2026-02-10T00:00:00Z"),
      undefined,
      "owner@example.com",
    );

    // failRenewal sends grace warning + downgradeExpiredGrace sends downgrade notification
    expect(fakeEmail.sent).toHaveLength(2);
    expect(fakeEmail.sent[1]?.subject).toContain("degradado");
  });

  it("does not send notification when no emailSender", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService(subRepo, planRepo);

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"));

    const result = await service.downgradeExpiredGrace(
      sub.id,
      "community",
      new Date("2026-02-10T00:00:00Z"),
    );

    expect(result).not.toBeNull();
  });

  it("does not send notification when no recipientEmail", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const fakeEmail = new FakeEmailSender();
    const service = new SubscriptionService(subRepo, planRepo, undefined, fakeEmail);

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"), "owner@example.com");

    await service.downgradeExpiredGrace(sub.id, "community", new Date("2026-02-10T00:00:00Z"));

    // Only the grace warning from failRenewal, no downgrade notification
    expect(fakeEmail.sent).toHaveLength(1);
    expect(fakeEmail.sent[0]?.subject).toContain("gracia");
  });
});
