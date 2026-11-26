import type { BillingInterval } from "@aqui-suena/api/domain/billing/billing-interval";
import type {
  Subscription,
  SubscriptionRepository,
} from "@aqui-suena/api/domain/billing/subscriptions/model/subscription";
import { ConflictError, NotFoundError } from "@aqui-suena/api/shared/domain-error";

export type RenewSubscriptionDependencies = {
  readonly subscriptions: SubscriptionRepository;
};

export class RenewSubscription {
  constructor(private readonly deps: RenewSubscriptionDependencies) {}

  async execute(
    subscriptionId: string,
    endsAt: Date,
    billingInterval: BillingInterval,
  ): Promise<Subscription> {
    const current = await this.deps.subscriptions.getById(subscriptionId);

    if (!current) {
      throw new NotFoundError("Subscription not found");
    }

    if (current.status === "expired") {
      throw new ConflictError("Cannot renew an expired subscription");
    }

    const nextEnd = current.endsAt !== null && current.endsAt > endsAt ? current.endsAt : endsAt;

    await this.deps.subscriptions.renew(subscriptionId, nextEnd, billingInterval);

    const renewed = await this.deps.subscriptions.getById(subscriptionId);

    if (!renewed) {
      throw new NotFoundError("Subscription not found");
    }

    return renewed;
  }
}
