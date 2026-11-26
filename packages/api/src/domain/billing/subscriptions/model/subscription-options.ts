import type { BillingInterval } from "@aqui-suena/api/domain/billing/billing-interval";
import type { EmailLocale } from "@aqui-suena/api/domain/email/email-template";

export interface SubscriptionNotificationOptions {
  readonly recipientEmail?: string;
  readonly locale?: EmailLocale;
}

export interface SubscriptionPlanChangeOptions extends SubscriptionNotificationOptions {
  readonly visibleBusinessIds?: string[];
  readonly billingInterval?: BillingInterval;
  readonly now?: Date;
}
