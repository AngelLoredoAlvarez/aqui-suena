import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { SubscriptionService } from "@aqui-suena/api/domain/billing/subscriptions/subscription-service";
import { plans } from "@aqui-suena/api/domain/billing/subscriptions/subscription-service.fixtures";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { describe, expect, it } from "vitest";

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
