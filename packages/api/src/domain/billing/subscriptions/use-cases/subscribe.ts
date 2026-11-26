import type { BillingInterval } from "@aqui-suena/api/domain/billing/model/billing-interval";
import { addInterval } from "@aqui-suena/api/domain/billing/subscriptions/model/period";
import type {
  Subscription,
  SubscriptionRepository,
} from "@aqui-suena/api/domain/billing/subscriptions/model/subscription";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";

export type SubscribeToPlanDependencies = {
  readonly subscriptions: SubscriptionRepository;
};

export class SubscribeToPlan {
  constructor(private readonly deps: SubscribeToPlanDependencies) {}

  async execute(
    accountId: string,
    planId: PlanId,
    startedAt: Date,
    endsAt: Date,
    billingInterval: BillingInterval = "monthly",
  ): Promise<Subscription> {
    const existing = await this.deps.subscriptions.listByAccount(accountId);

    const cancelled = existing.find((sub) => sub.status === "cancelled" && sub.planId === planId);

    for (const sub of existing) {
      if (sub.status === "active") {
        await this.deps.subscriptions.updateStatus(sub.id, "cancelled");
      }
    }

    if (cancelled && cancelled.endsAt !== null && cancelled.endsAt > startedAt) {
      await this.deps.subscriptions.renew(
        cancelled.id,
        addInterval(cancelled.endsAt, billingInterval),
        billingInterval,
      );

      const resumed = await this.deps.subscriptions.getById(cancelled.id);

      if (!resumed) {
        throw new NotFoundError("Subscription not found");
      }

      return resumed;
    }

    return this.deps.subscriptions.create(accountId, planId, startedAt, endsAt, billingInterval);
  }
}
