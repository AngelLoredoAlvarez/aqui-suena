import type { PaymentMethod } from "@aqui-suena/api/domain/billing/payments/payment";
import type {
  BillingPeriod,
  PaymentNotificationRecipient,
  PaymentNotifier,
  PaymentPendingNotification,
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

const METHOD_LABELS: Record<EmailLocale, Record<PaymentMethod, string>> = {
  "es-MX": { card: "Tarjeta", cash: "Efectivo", spei: "SPEI" },
  en: { card: "Card", cash: "Cash", spei: "SPEI" },
};

/**
 * Renders payment emails from the transactional template catalog and hands
 * them to the transport.
 */
export class TemplatePaymentNotifier implements PaymentNotifier {
  constructor(
    private readonly emailSender: EmailSender,
    private readonly renderer: EmailTemplateRenderer,
    private readonly billingUrl: string,
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
      method: METHOD_LABELS[recipient.locale][data.method],
      paidAt: formatEmailDate(recipient.locale, data.paidAt),
    });
  }

  async paymentPending(
    recipient: PaymentNotificationRecipient,
    data: PaymentPendingNotification,
  ): Promise<void> {
    await sendRenderedEmail(this.emailSender, this.renderer, "payment-pending", recipient, {
      planName: data.planName,
      method: METHOD_LABELS[recipient.locale][data.method],
      amount: formatEmailMoney(recipient.locale, data.amountMinorUnits, data.currency),
      reference: data.reference ?? "—",
      expiresAt: data.expiresAt === null ? "—" : formatEmailDate(recipient.locale, data.expiresAt),
      actionUrl: data.nextActionUrl ?? this.billingUrl,
    });
  }
}
