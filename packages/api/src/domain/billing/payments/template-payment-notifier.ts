import type {
  BillingPeriod,
  PaymentNotificationRecipient,
  PaymentNotifier,
  PaymentReceiptNotification,
} from "@aqui-suena/api/domain/billing/payments/payment-notifier";
import type { EmailSender } from "@aqui-suena/api/domain/email/email";
import { formatEmailDate, formatEmailMoney } from "@aqui-suena/api/domain/email/email-format";
import type {
  EmailLocale,
  EmailTemplateRenderer,
} from "@aqui-suena/api/domain/email/email-template";
import { sendRenderedEmail } from "@aqui-suena/api/domain/email/template-email-sender";

const PERIOD_LABELS: Record<EmailLocale, Record<BillingPeriod, string>> = {
  "es-MX": { monthly: "Mensual", annual: "Anual" },
  en: { monthly: "Monthly", annual: "Annual" },
};

/**
 * Renders payment emails from the transactional template catalog and hands
 * them to the transport.
 */
export class TemplatePaymentNotifier implements PaymentNotifier {
  constructor(
    private readonly emailSender: EmailSender,
    private readonly renderer: EmailTemplateRenderer,
  ) {}

  async paymentReceipt(
    recipient: PaymentNotificationRecipient,
    data: PaymentReceiptNotification,
  ): Promise<void> {
    await sendRenderedEmail(this.emailSender, this.renderer, "receipt", recipient, {
      paymentId: data.paymentId,
      planName: data.planName,
      period: PERIOD_LABELS[recipient.locale][data.billingPeriod],
      amount: formatEmailMoney(recipient.locale, data.amountMinorUnits, data.currency),
      paidAt: formatEmailDate(recipient.locale, data.paidAt),
    });
  }
}
