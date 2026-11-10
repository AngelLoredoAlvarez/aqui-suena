import type { EmailLocale } from "@aqui-suena/api/domain/email/email-template";

export interface SubscriptionNotificationRecipient {
  readonly email: string;
  readonly locale: EmailLocale;
}

export interface PlanDowngradedNotification {
  readonly planName: string;
}

export interface RenewalFailedNotification {
  readonly graceEnd: Date;
}

export interface GraceExpiredNotification {
  readonly planName: string;
}

export interface RenewalUpcomingNotification {
  readonly daysBefore: 7 | 1;
  readonly renewalDate: Date;
}

export interface CancellationNotification {
  readonly planName: string;
  readonly activeUntil: Date;
}

/**
 * Notifies an account owner about subscription lifecycle events.
 * Implementations own the message content; callers own the event.
 */
export interface SubscriptionNotifier {
  planDowngraded(
    recipient: SubscriptionNotificationRecipient,
    data: PlanDowngradedNotification,
  ): Promise<void>;

  renewalFailed(
    recipient: SubscriptionNotificationRecipient,
    data: RenewalFailedNotification,
  ): Promise<void>;

  graceExpired(
    recipient: SubscriptionNotificationRecipient,
    data: GraceExpiredNotification,
  ): Promise<void>;

  renewalUpcoming(
    recipient: SubscriptionNotificationRecipient,
    data: RenewalUpcomingNotification,
  ): Promise<void>;

  cancelled(
    recipient: SubscriptionNotificationRecipient,
    data: CancellationNotification,
  ): Promise<void>;
}

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
 * Test double that records notifications instead of sending them.
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
