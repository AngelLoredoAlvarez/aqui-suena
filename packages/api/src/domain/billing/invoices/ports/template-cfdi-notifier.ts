import type {
  CfdiInvoiceNotification,
  CfdiNotifier,
  CfdiRecipient,
} from "@aqui-suena/api/domain/billing/invoices/ports/cfdi-notifier";
import type { EmailAttachment, EmailSender } from "@aqui-suena/api/domain/email/email";
import { formatEmailDate, formatEmailMoney } from "@aqui-suena/api/domain/email/email-format";
import type { EmailTemplateRenderer } from "@aqui-suena/api/domain/email/email-template";
import { sendRenderedEmail } from "@aqui-suena/api/domain/email/template-email-sender";
import { toBase64 } from "@aqui-suena/api/shared/base64";

/** Delivers a stamped CFDI: the provider PDF and the archived XML travel attached. */
export class TemplateCfdiNotifier implements CfdiNotifier {
  constructor(
    private readonly emailSender: EmailSender,
    private readonly renderer: EmailTemplateRenderer,
  ) {}

  async invoiceIssued(recipient: CfdiRecipient, invoice: CfdiInvoiceNotification): Promise<void> {
    await sendRenderedEmail(
      this.emailSender,
      this.renderer,
      "invoice-cfdi",
      recipient,
      {
        invoiceId: invoice.invoiceId,
        planName: invoice.planName,
        issuedAt: formatEmailDate(recipient.locale, invoice.issuedAt),
        amount: formatEmailMoney(recipient.locale, invoice.amountMinorUnits, invoice.currency),
        downloadUrl: invoice.downloadUrl,
      },
      this.files(invoice),
    );
  }

  /** PDF first: it is what the owner opens. The XML is the legal document. */
  private files(invoice: CfdiInvoiceNotification): EmailAttachment[] {
    const files: EmailAttachment[] = [];

    if (invoice.pdf !== undefined) {
      files.push({
        filename: `CFDI-${invoice.uuid}.pdf`,
        content: toBase64(invoice.pdf),
        contentType: "application/pdf",
      });
    }

    files.push({
      filename: `CFDI-${invoice.uuid}.xml`,
      content: toBase64(new TextEncoder().encode(invoice.xml)),
      contentType: "application/xml",
    });

    return files;
  }
}
