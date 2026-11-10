import type {
  AccountNotificationRecipient,
  AccountNotifier,
  AccountWelcomeNotification,
  EmailVerificationNotification,
} from "@aqui-suena/api/domain/accounts/account-notifier";
import type {
  PaymentNotificationRecipient,
  PaymentNotifier,
  PaymentReceiptNotification,
} from "@aqui-suena/api/domain/billing/payments/payment-notifier";
import type {
  CancellationNotification,
  GraceExpiredNotification,
  PlanDowngradedNotification,
  RenewalFailedNotification,
  RenewalUpcomingNotification,
  SubscriptionNotificationRecipient,
  SubscriptionNotifier,
} from "@aqui-suena/api/domain/billing/subscriptions/subscription-notifier";

export type SubscriptionNotificationCall =
  | {
      readonly event: "plan-downgraded";
      readonly recipient: SubscriptionNotificationRecipient;
      readonly data: PlanDowngradedNotification;
    }
  | {
      readonly event: "renewal-failed";
      readonly recipient: SubscriptionNotificationRecipient;
      readonly data: RenewalFailedNotification;
    }
  | {
      readonly event: "grace-expired";
      readonly recipient: SubscriptionNotificationRecipient;
      readonly data: GraceExpiredNotification;
    }
  | {
      readonly event: "renewal-upcoming";
      readonly recipient: SubscriptionNotificationRecipient;
      readonly data: RenewalUpcomingNotification;
    }
  | {
      readonly event: "cancelled";
      readonly recipient: SubscriptionNotificationRecipient;
      readonly data: CancellationNotification;
    };

/**
 * Test double that records subscription notifications instead of sending them.
 */
export class FakeSubscriptionNotifier implements SubscriptionNotifier {
  readonly calls: SubscriptionNotificationCall[] = [];

  async planDowngraded(
    recipient: SubscriptionNotificationRecipient,
    data: PlanDowngradedNotification,
  ): Promise<void> {
    this.calls.push({ event: "plan-downgraded", recipient, data });
  }

  async renewalFailed(
    recipient: SubscriptionNotificationRecipient,
    data: RenewalFailedNotification,
  ): Promise<void> {
    this.calls.push({ event: "renewal-failed", recipient, data });
  }

  async graceExpired(
    recipient: SubscriptionNotificationRecipient,
    data: GraceExpiredNotification,
  ): Promise<void> {
    this.calls.push({ event: "grace-expired", recipient, data });
  }

  async renewalUpcoming(
    recipient: SubscriptionNotificationRecipient,
    data: RenewalUpcomingNotification,
  ): Promise<void> {
    this.calls.push({ event: "renewal-upcoming", recipient, data });
  }

  async cancelled(
    recipient: SubscriptionNotificationRecipient,
    data: CancellationNotification,
  ): Promise<void> {
    this.calls.push({ event: "cancelled", recipient, data });
  }
}

export type AccountNotificationCall =
  | {
      readonly event: "email-verification-requested";
      readonly recipient: AccountNotificationRecipient;
      readonly data: EmailVerificationNotification;
    }
  | {
      readonly event: "welcome";
      readonly recipient: AccountNotificationRecipient;
      readonly data: AccountWelcomeNotification;
    };

/**
 * Test double that records account notifications instead of sending them.
 */
export class FakeAccountNotifier implements AccountNotifier {
  readonly calls: AccountNotificationCall[] = [];

  async emailVerificationRequested(
    recipient: AccountNotificationRecipient,
    data: EmailVerificationNotification,
  ): Promise<void> {
    this.calls.push({ event: "email-verification-requested", recipient, data });
  }

  async welcome(
    recipient: AccountNotificationRecipient,
    data: AccountWelcomeNotification,
  ): Promise<void> {
    this.calls.push({ event: "welcome", recipient, data });
  }
}

export type PaymentNotificationCall = {
  readonly event: "payment-receipt";
  readonly recipient: PaymentNotificationRecipient;
  readonly data: PaymentReceiptNotification;
};

/**
 * Test double that records payment notifications instead of sending them.
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
