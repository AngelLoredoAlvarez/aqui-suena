import { graceDeadline } from "@aqui-suena/api/domain/billing/subscriptions/grace";
import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import type { SubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/subscription-notifier";
import type { SubscriptionNotificationOptions } from "@aqui-suena/api/domain/billing/subscriptions/subscription-options";
import { DEFAULT_EMAIL_LOCALE } from "@aqui-suena/api/domain/email/email-template";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";

export type FailRenewalDependencies = {
  readonly subscriptions: SubscriptionRepository;
  readonly notifier?: SubscriptionNotifier;
};

export class FailRenewal {
  constructor(private readonly deps: FailRenewalDependencies) {}

  async execute(
    subscriptionId: string,
    failedAt: Date,
    options: SubscriptionNotificationOptions = {},
  ): Promise<void> {
    const { recipientEmail, locale = DEFAULT_EMAIL_LOCALE } = options;

    const current = await this.deps.subscriptions.getById(subscriptionId);

    if (!current) {
      throw new NotFoundError("Subscription not found");
    }

    const graceEnd = graceDeadline(failedAt);

    await this.deps.subscriptions.enterGrace(subscriptionId, graceEnd);

    if (this.deps.notifier && recipientEmail) {
      await this.deps.notifier.renewalFailed({ email: recipientEmail, locale }, { graceEnd });
    }
  }
}
