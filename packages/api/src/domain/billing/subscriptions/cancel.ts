import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import type { SubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/subscription-notifier";
import type { SubscriptionNotificationOptions } from "@aqui-suena/api/domain/billing/subscriptions/subscription-options";
import { DEFAULT_EMAIL_LOCALE } from "@aqui-suena/api/domain/email/email-template";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";

export type CancelSubscriptionDependencies = {
  readonly subscriptions: SubscriptionRepository;
  readonly plans: PlanRepository;
  readonly notifier?: SubscriptionNotifier;
};

export class CancelSubscription {
  constructor(private readonly deps: CancelSubscriptionDependencies) {}

  async execute(
    subscriptionId: string,
    options: SubscriptionNotificationOptions = {},
  ): Promise<void> {
    const { recipientEmail, locale = DEFAULT_EMAIL_LOCALE } = options;

    const current = await this.deps.subscriptions.getById(subscriptionId);

    if (!current) {
      throw new NotFoundError("Subscription not found");
    }

    const wasActive = current.status === "active";

    if (current.status === "cancelled" || current.status === "expired") {
      return;
    }

    await this.deps.subscriptions.updateStatus(subscriptionId, "cancelled");

    if (this.deps.notifier && recipientEmail) {
      const plan = await this.deps.plans.getById(current.planId);

      await this.deps.notifier.cancelled(
        { email: recipientEmail, locale },
        {
          planName: plan?.name ?? current.planId,
          activeUntil: wasActive ? current.endsAt : null,
        },
      );
    }
  }
}
