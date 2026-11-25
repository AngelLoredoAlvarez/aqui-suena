import type {
  ActivateSubscriptionInput,
  PaymentSubscriptionWriter,
} from "@aqui-suena/api/domain/billing/payments/payment-subscription-writer";
import type { RenewSubscription } from "@aqui-suena/api/domain/billing/subscriptions/renew";
import type { SubscribeToPlan } from "@aqui-suena/api/domain/billing/subscriptions/subscribe";
import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";

export type SubscriptionPaymentWriterDependencies = {
  readonly subscriptions: SubscriptionRepository;
  readonly subscribe: Pick<SubscribeToPlan, "execute">;
  readonly renew: Pick<RenewSubscription, "execute">;
  readonly now?: () => Date;
};

export class SubscriptionPaymentWriter implements PaymentSubscriptionWriter {
  private readonly deps: SubscriptionPaymentWriterDependencies;

  constructor(deps: SubscriptionPaymentWriterDependencies) {
    this.deps = deps;
  }

  async activate(input: ActivateSubscriptionInput): Promise<string> {
    const now = this.deps.now?.() ?? new Date();
    const current = await this.deps.subscriptions.getActive(input.accountId, now);

    if (current !== null && current.planId === input.planId) {
      const renewed = await this.deps.renew.execute(
        current.id,
        input.periodEnd,
        input.billingInterval,
      );

      return renewed.id;
    }

    const created = await this.deps.subscribe.execute(
      input.accountId,
      input.planId,
      input.periodStart,
      input.periodEnd,
      input.billingInterval,
    );

    return created.id;
  }
}
