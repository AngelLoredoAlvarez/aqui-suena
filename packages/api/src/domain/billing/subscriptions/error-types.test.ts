import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { SubscriptionService } from "@aqui-suena/api/domain/billing/subscriptions/subscription-service";
import { plans } from "@aqui-suena/api/domain/billing/subscriptions/subscription-service.fixtures";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { ConflictError, NotFoundError } from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it } from "vitest";

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
