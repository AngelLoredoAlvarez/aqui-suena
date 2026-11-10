import type {
  AccountNotificationRecipient,
  AccountNotifier,
  AccountWelcomeNotification,
  EmailVerificationNotification,
} from "@aqui-suena/api/domain/accounts/account-notifier";
import type { EmailSender } from "@aqui-suena/api/domain/email/email";
import { formatEmailHours } from "@aqui-suena/api/domain/email/email-format";
import type { EmailTemplateRenderer } from "@aqui-suena/api/domain/email/email-template";
import { sendRenderedEmail } from "@aqui-suena/api/domain/email/template-email-sender";

/**
 * Renders account lifecycle emails from the transactional template catalog
 * and hands them to the transport.
 */
export class TemplateAccountNotifier implements AccountNotifier {
  constructor(
    private readonly emailSender: EmailSender,
    private readonly renderer: EmailTemplateRenderer,
  ) {}

  async emailVerificationRequested(
    recipient: AccountNotificationRecipient,
    data: EmailVerificationNotification,
  ): Promise<void> {
    await sendRenderedEmail(this.emailSender, this.renderer, "verify-email", recipient, {
      verifyUrl: data.verificationUrl,
      expiresIn: formatEmailHours(recipient.locale, data.expiresInHours),
    });
  }

  async welcome(
    recipient: AccountNotificationRecipient,
    data: AccountWelcomeNotification,
  ): Promise<void> {
    await sendRenderedEmail(this.emailSender, this.renderer, "welcome", recipient, {
      businessName: data.businessName,
      recommendedPlan: data.recommendedPlanName,
    });
  }
}
