import type { EmailLocale } from "@aqui-suena/api/domain/email/email-template";

export interface AccountNotificationRecipient {
  readonly email: string;
  readonly locale: EmailLocale;
}

export interface EmailVerificationNotification {
  /** Full verification URL, token included. The auth flow owns token creation. */
  readonly verificationUrl: string;
  readonly expiresInHours: number;
}

export interface AccountWelcomeNotification {
  readonly businessName: string;
  readonly recommendedPlanName: string;
}

/**
 * Notifies an account owner about account lifecycle events.
 * Kept separate from SubscriptionNotifier: different reason to change.
 */
export interface AccountNotifier {
  emailVerificationRequested(
    recipient: AccountNotificationRecipient,
    data: EmailVerificationNotification,
  ): Promise<void>;

  welcome(recipient: AccountNotificationRecipient, data: AccountWelcomeNotification): Promise<void>;
}
