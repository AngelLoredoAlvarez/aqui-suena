import type {
  CfdiDocumentStore,
  CfdiInvoice,
  CfdiInvoiceRepository,
} from "@aqui-suena/api/domain/billing/invoices/invoice";
import type { InvoiceIssuer } from "@aqui-suena/api/domain/billing/invoices/invoice-issuer";

/** The sweep shares the fifteen-minute cron, so each run stays small. */
const DEFAULT_LIMIT = 5;

export type ArchiveStage = "xml" | "pdf";

export type RecoverMissingArchivesDependencies = {
  readonly invoices: Pick<
    CfdiInvoiceRepository,
    "listMissingArchivesForAllAccounts" | "recordArchiveAttempt"
  >;
  readonly provider: Pick<InvoiceIssuer, "downloadXml" | "downloadPdf">;
  readonly documents: Pick<CfdiDocumentStore, "saveXml" | "savePdf">;
  readonly limit?: number;
  readonly now?: () => Date;
  /** One document failing must not stop the other, nor the rest of the batch. */
  readonly onError?: (error: unknown, invoiceId: string, stage: ArchiveStage) => void;
};

export type ArchiveRecoveryResult = {
  readonly checked: number;
  /** Rows that got at least one document back into storage. */
  readonly recovered: number;
};

/**
 * Re-archives fiscal documents that never reached storage when the CFDI was
 * stamped. A stamped CFDI cannot be reissued, so the provider is the only
 * remaining source: the row keeps its `provider_id` and lost only the R2 key.
 *
 * Every listed row is stamped once per run, even when nothing was recovered, so
 * a provider outage rotates the batch instead of pinning the same rows forever.
 */
export class RecoverMissingArchives {
  private readonly deps: RecoverMissingArchivesDependencies;

  constructor(deps: RecoverMissingArchivesDependencies) {
    this.deps = deps;
  }

  async execute(): Promise<ArchiveRecoveryResult> {
    const now = this.deps.now?.() ?? new Date();

    const candidates = await this.deps.invoices.listMissingArchivesForAllAccounts({
      limit: this.deps.limit ?? DEFAULT_LIMIT,
    });

    let checked = 0;

    let recovered = 0;

    for (const invoice of candidates) {
      const providerId = invoice.providerId;

      // The query excludes null ids; the guard covers an inconsistent row.
      if (providerId === null) continue;

      checked += 1;

      const xmlKey = await this.recoverXml(invoice, providerId);

      const pdfKey = await this.recoverPdf(invoice, providerId);

      if (xmlKey !== null || pdfKey !== null) recovered += 1;

      await this.deps.invoices.recordArchiveAttempt({
        id: invoice.id,
        accountId: invoice.accountId,
        xmlKey,
        pdfKey,
        attemptedAt: now,
      });
    }

    return { checked, recovered };
  }

  private async recoverXml(invoice: CfdiInvoice, providerId: string): Promise<string | null> {
    if (invoice.xmlKey !== null) return null;

    try {
      const xml = await this.deps.provider.downloadXml(providerId);

      return await this.deps.documents.saveXml({ accountId: invoice.accountId, xml });
    } catch (error) {
      this.deps.onError?.(error, invoice.id, "xml");

      return null;
    }
  }

  private async recoverPdf(invoice: CfdiInvoice, providerId: string): Promise<string | null> {
    if (invoice.pdfKey !== null) return null;

    try {
      const pdf = await this.deps.provider.downloadPdf(providerId);

      return await this.deps.documents.savePdf({ accountId: invoice.accountId, pdf });
    } catch (error) {
      this.deps.onError?.(error, invoice.id, "pdf");

      return null;
    }
  }
}
