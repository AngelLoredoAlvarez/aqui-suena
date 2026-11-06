import type { PlanRepository } from "@aqui-suena/api/domain/billing/plans";
import type {
  Subscription,
  SubscriptionRepository,
} from "@aqui-suena/api/domain/billing/subscriptions";
import type { PlanId } from "@aqui-suena/api/entitlements";

const PERIOD_MONTHS = 1;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export class SubscriptionService {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly planRepo: PlanRepository,
  ) {}

  /**
   * Creates a new subscription for an account, cancelling any subscription
   * that is currently active (or in its grace period) first.
   *
   * Enforces the invariant "at most one active subscription per account"
   * at the service boundary. A database-level partial unique index is the
   * only protection against direct repository calls and race conditions.
   */
  async subscribe(
    accountId: string,
    planId: PlanId,
    startedAt: Date,
    endsAt: Date,
  ): Promise<Subscription> {
    const existing = await this.subscriptionRepo.listByAccount(accountId);

    for (const sub of existing) {
      if (sub.status === "active") {
        await this.subscriptionRepo.updateStatus(sub.id, "cancelled");
      }
    }

    return this.subscriptionRepo.create(accountId, planId, startedAt, endsAt);
  }

  async changePlan(subscriptionId: string, newPlanId: PlanId): Promise<Subscription> {
    const current = await this.subscriptionRepo.getById(subscriptionId);
    if (!current) {
      throw new Error("Subscription not found");
    }
    if (current.status !== "active") {
      throw new Error("Subscription is not active");
    }

    const currentPlan = await this.planRepo.getById(current.planId);
    const newPlan = await this.planRepo.getById(newPlanId);
    if (!currentPlan || !newPlan) {
      throw new Error("Plan not found");
    }

    if (current.planId === newPlanId) {
      throw new Error("Already on this plan");
    }

    const isUpgrade = newPlan.entitlements.priority > currentPlan.entitlements.priority;

    if (isUpgrade) {
      await this.subscriptionRepo.updateStatus(subscriptionId, "expired");

      const now = new Date();
      const endsAt = addMonths(now, PERIOD_MONTHS);
      return this.subscriptionRepo.create(current.accountId, newPlanId, now, endsAt);
    }

    await this.subscriptionRepo.updateStatus(subscriptionId, "cancelled");

    const now = new Date();
    const startedAt = current.endsAt ?? now;
    const endsAt = addMonths(startedAt, PERIOD_MONTHS);

    await this.subscriptionRepo.create(current.accountId, newPlanId, startedAt, endsAt);

    return current;
  }

  async cancel(subscriptionId: string): Promise<void> {
    const current = await this.subscriptionRepo.getById(subscriptionId);
    if (!current) {
      throw new Error("Subscription not found");
    }
    if (current.status !== "active") {
      throw new Error("Subscription is not active");
    }

    await this.subscriptionRepo.updateStatus(subscriptionId, "cancelled");
  }
}
