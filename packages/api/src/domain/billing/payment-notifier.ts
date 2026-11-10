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

export type PaymentNotificationCall = {
  readonly event: "payment-receipt";
  readonly recipient: PaymentNotificationRecipient;
  readonly data: PaymentReceiptNotification;
};

/**
 * Test double that records notifications instead of sending them.
 */
export class FakePaymentNotifier implements PaymentNotifier {
  readonly calls: PaymentNotificationCall[] = [];

  async paymentReceipt(
    recipient: PaymentNotificationRecipient,
    data: PaymentReceiptNotification,
  ): Promise<void> {
    this.calls.push({ event: "payment-receipt", recipient, data });
  }
}
