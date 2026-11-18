import type { EmailLocale } from "@aqui-suena/api/domain/email/email-template";

export interface CfdiRecipient {
  readonly email: string;
  readonly locale: EmailLocale;
}

export interface CfdiInvoiceNotification {
  readonly invoiceId: string;
  readonly uuid: string;
  readonly planName: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly issuedAt: Date;
  /** Where the CTA sends the owner; the files themselves travel attached. */
  readonly downloadUrl: string;
  /** Stamped XML, exactly as archived. */
  readonly xml: string;
  /** Provider PDF; absent when the download failed, so the mail still goes out. */
  readonly pdf?: Uint8Array;
}

export interface CfdiNotifier {
  invoiceIssued(recipient: CfdiRecipient, invoice: CfdiInvoiceNotification): Promise<void>;
}
