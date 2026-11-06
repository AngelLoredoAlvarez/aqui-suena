import type { Plan } from "@aqui-suena/api/domain/billing/plans";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/billing/plans";
import { SubscriptionService } from "@aqui-suena/api/domain/billing/subscription-service";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions";
import type { PlanId } from "@aqui-suena/api/entitlements";
import { ENTITLEMENTS } from "@aqui-suena/api/entitlements";
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

    // Durante el período pago, sigue vigente el plan viejo.
    const during = await subRepo.getActive("acc-1", new Date("2026-01-15"));
    expect(during?.planId).toBe("commerce");

    // Cuando vence el período, toma efecto el plan nuevo.
    const after = await subRepo.getActive("acc-1", new Date("2026-02-15"));
    expect(after?.planId).toBe("trades");
    expect(after?.status).toBe("active");
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
