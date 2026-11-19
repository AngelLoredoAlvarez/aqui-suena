import type {
  ActivateSubscriptionInput,
  PaymentSubscriptionWriter,
} from "@aqui-suena/api/domain/billing/payments/payment-subscription-writer";
import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import type { SubscriptionService } from "@aqui-suena/api/domain/billing/subscriptions/subscription-service";

export type SubscriptionPaymentWriterDependencies = {
  readonly subscriptions: SubscriptionRepository;
  readonly service: SubscriptionService;
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
      const renewed = await this.deps.service.renew(
        current.id,
        input.periodEnd,
        input.billingInterval,
      );

      return renewed.id;
    }

    const created = await this.deps.service.subscribe(
      input.accountId,
      input.planId,
      input.periodStart,
      input.periodEnd,
      input.billingInterval,
    );

    return created.id;
  }
}
