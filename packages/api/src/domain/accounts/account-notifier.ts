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
 * Test double that records notifications instead of sending them.
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
