import type { EmailLocale } from "@aqui-suena/api/domain/email/email-template";

export type BillingPeriod = "monthly" | "annual";

export interface PaymentNotificationRecipient {
  readonly email: string;
  readonly locale: EmailLocale;
}

export interface PaymentReceiptNotification {
  readonly paymentId: string;
  readonly planName: string;
  readonly billingPeriod: BillingPeriod;
  /** Amount in minor units (cents), as stored by the payment repository. */
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly paidAt: Date;
}

/**
 * Notifies an account owner about payment events.
 */
export interface PaymentNotifier {
  paymentReceipt(
    recipient: PaymentNotificationRecipient,
    data: PaymentReceiptNotification,
  ): Promise<void>;
}
