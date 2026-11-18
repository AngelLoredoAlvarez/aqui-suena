import { archiveAcuse, mergeDetail } from "@aqui-suena/api/domain/billing/invoices/archive-acuse";
import { cancellationStateFor } from "@aqui-suena/api/domain/billing/invoices/cancellation-outcome";
import type {
  CfdiDocumentStore,
  CfdiInvoice,
  CfdiInvoiceRepository,
} from "@aqui-suena/api/domain/billing/invoices/invoice";
import type { InvoiceCanceller } from "@aqui-suena/api/domain/billing/invoices/invoice-canceller";

export type ReconcileCancellationsDependencies = {
  readonly invoices: CfdiInvoiceRepository;
  readonly canceller: InvoiceCanceller;
  readonly documents: CfdiDocumentStore;
  readonly now?: () => Date;
  /** A row checked more recently than this is left alone. */
  readonly staleAfterMs?: number;
  /** Upper bound per call, so a listing never turns into a batch job. */
  readonly maxPerRun?: number;
  /** A provider failure must not break the read that triggered it. */
  readonly onError?: (error: unknown, invoiceId: string) => void;
};

const DEFAULT_STALE_AFTER_MS = 15 * 60 * 1000;
const DEFAULT_MAX_PER_RUN = 5;

/**
 * Refreshes cancellations that are still waiting on the receiver.
 *
 * The SAT resolves a request on its own clock: after 72 business hours without an
 * answer the positive ficta cancels the CFDI, and nobody tells us. Reading the
 * history is the cheapest moment to ask, so the owner never sees "pending" for an
 * invoice that was already cancelled.
 */
export class ReconcileCancellations {
  private readonly deps: ReconcileCancellationsDependencies;

  constructor(deps: ReconcileCancellationsDependencies) {
    this.deps = deps;
  }

  async execute(input: { accountId: string }): Promise<{ checked: number; updated: number }> {
    const now = this.deps.now?.() ?? new Date();
    const staleAfterMs = this.deps.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
    const pending = await this.deps.invoices.listPendingCancellations({
      accountId: input.accountId,
      limit: this.deps.maxPerRun ?? DEFAULT_MAX_PER_RUN,
    });

    let checked = 0;
    let updated = 0;

    for (const invoice of pending) {
      if (!needsCheck(invoice, now, staleAfterMs)) continue;

      checked += 1;

      try {
        if (await this.refresh(invoice, now)) updated += 1;
      } catch (error) {
        // One stuck invoice must not stop the rest, nor fail the listing.
        this.deps.onError?.(error, invoice.id);
      }
    }

    return { checked, updated };
  }

  private async refresh(invoice: CfdiInvoice, now: Date): Promise<boolean> {
    if (invoice.providerId === null) return false;

    const result = await this.deps.canceller.cancellationStatus(invoice.providerId);
    const state = cancellationStateFor(result, now);
    const acuse = await archiveAcuse({
      documents: this.deps.documents,
      accountId: invoice.accountId,
      invoiceUuid: invoice.uuid,
      acuseXml: result.acuseXml,
      onArchiveError: this.deps.onError,
    });

    await this.deps.invoices.recordCancellationOutcome({
      id: invoice.id,
      accountId: invoice.accountId,
      status: state.status,
      resolvedAt: state.resolvedAt,
      expiresAt: state.expiresAt,
      detail: mergeDetail(result.detail, acuse.warning),
      acuseKey: acuse.key ?? invoice.acuseKey,
      updatedAt: now,
    });

    return true;
  }
}

/**
 * A pending row is due when the receiver window already closed (the SAT may have
 * applied the positive ficta) or when nobody asked recently.
 */
function needsCheck(invoice: CfdiInvoice, now: Date, staleAfterMs: number): boolean {
  if (invoice.cancellationExpiresAt !== null && invoice.cancellationExpiresAt <= now) {
    return true;
  }

  return now.getTime() - invoice.updatedAt.getTime() >= staleAfterMs;
}
