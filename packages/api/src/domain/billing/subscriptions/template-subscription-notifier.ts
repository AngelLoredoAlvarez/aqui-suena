import type {
  CancellationNotification,
  GraceExpiredNotification,
  PlanDowngradedNotification,
  RenewalFailedNotification,
  RenewalUpcomingNotification,
  SubscriptionNotificationRecipient,
  SubscriptionNotifier,
} from "@aqui-suena/api/domain/billing/subscriptions/subscription-notifier";
import type { EmailSender } from "@aqui-suena/api/domain/email/email";
import { formatEmailDate } from "@aqui-suena/api/domain/email/email-format";
import type { EmailTemplateRenderer } from "@aqui-suena/api/domain/email/email-template";
import { sendRenderedEmail } from "@aqui-suena/api/domain/email/template-email-sender";

/**
 * Renders subscription lifecycle emails from the transactional template
 * catalog and hands them to the transport.
 */
export class TemplateSubscriptionNotifier implements SubscriptionNotifier {
  constructor(
    private readonly emailSender: EmailSender,
    private readonly renderer: EmailTemplateRenderer,
  ) {}

  async planDowngraded(
    recipient: SubscriptionNotificationRecipient,
    data: PlanDowngradedNotification,
  ): Promise<void> {
    await sendRenderedEmail(this.emailSender, this.renderer, "downgrade", recipient, {
      planName: data.planName,
    });
  }

  async renewalFailed(
    recipient: SubscriptionNotificationRecipient,
    data: RenewalFailedNotification,
  ): Promise<void> {
    await sendRenderedEmail(this.emailSender, this.renderer, "failed-renewal", recipient, {
      graceEnd: formatEmailDate(recipient.locale, data.graceEnd),
    });
  }

  async graceExpired(
    recipient: SubscriptionNotificationRecipient,
    data: GraceExpiredNotification,
  ): Promise<void> {
    await sendRenderedEmail(this.emailSender, this.renderer, "grace-expired", recipient, {
      planName: data.planName,
    });
  }

  async renewalUpcoming(
    recipient: SubscriptionNotificationRecipient,
    data: RenewalUpcomingNotification,
  ): Promise<void> {
    const templateId = data.daysBefore === 7 ? "renewal-7d" : "renewal-1d";

    await sendRenderedEmail(this.emailSender, this.renderer, templateId, recipient, {
      renewalDate: formatEmailDate(recipient.locale, data.renewalDate),
    });
  }

  async cancelled(
    recipient: SubscriptionNotificationRecipient,
    data: CancellationNotification,
  ): Promise<void> {
    await sendRenderedEmail(this.emailSender, this.renderer, "cancellation", recipient, {
      planName: data.planName,
      activeUntil: formatEmailDate(recipient.locale, data.activeUntil),
    });
  }
}
