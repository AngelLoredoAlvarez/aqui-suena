import { CancelSubscription } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/cancel";
import { ChangePlan } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/change-plan";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/infrastructure/memory/billing/in-memory-subscription-repository";
import { InMemoryPlanRepository } from "@aqui-suena/api/infrastructure/memory/plans/in-memory-plan-repository";
import { ConflictError, NotFoundError } from "@aqui-suena/api/shared/domain-error";
import { plans } from "@aqui-suena/api/testing/plan-fixtures";
import { describe, expect, it } from "vitest";

describe("subscription error types", () => {
  it("throws NotFoundError when the subscription is missing", async () => {
    const cancel = new CancelSubscription({
      subscriptions: new InMemorySubscriptionRepository(),
      plans: new InMemoryPlanRepository(plans),
    });

    await expect(cancel.execute("non-existent")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws ConflictError when the subscription is not active", async () => {
    const subRepo = new InMemorySubscriptionRepository();

    const changePlan = new ChangePlan({
      subscriptions: subRepo,
      plans: new InMemoryPlanRepository(plans),
    });

    const sub = await subRepo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );
    await subRepo.updateStatus(sub.id, "cancelled");

    await expect(changePlan.execute(sub.id, "trades")).rejects.toBeInstanceOf(ConflictError);
  });
});
