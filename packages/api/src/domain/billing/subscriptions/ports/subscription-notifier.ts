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
  readonly activeUntil: Date | null;
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
