import { archiveAcuse, mergeDetail } from "@aqui-suena/api/domain/billing/invoices/archive-acuse";
import { cancellationStateFor } from "@aqui-suena/api/domain/billing/invoices/cancellation-outcome";
import {
  cancellationDeadline,
  isWithinCancellationWindow,
} from "@aqui-suena/api/domain/billing/invoices/cancellation-window";
import type {
  CfdiCancellationMotive,
  CfdiDocumentStore,
  CfdiInvoice,
  CfdiInvoiceRepository,
} from "@aqui-suena/api/domain/billing/invoices/invoice";
import type {
  InvoiceCancellationResult,
  InvoiceCanceller,
} from "@aqui-suena/api/domain/billing/invoices/invoice-canceller";
import { InvoiceProviderRejection } from "@aqui-suena/api/domain/billing/invoices/invoice-issuer";
import {
  ConflictError,
  DataIntegrityError,
  NotFoundError,
  ValidationError,
} from "@aqui-suena/api/shared/domain-error";

export type CancelInvoiceDependencies = {
  readonly invoices: CfdiInvoiceRepository;
  readonly canceller: InvoiceCanceller;
  readonly documents: CfdiDocumentStore;
  readonly now?: () => Date;
  /** Reports a failed acuse archive so the loss stays diagnosable. */
  readonly onArchiveError?: (error: unknown, accountId: string) => void;
};

export type CancelInvoiceCommand = {
  readonly accountId: string;
  readonly invoiceId: string;
  readonly motive: CfdiCancellationMotive;
};

/**
 * Cancels an issued CFDI.
 *
 * The row is claimed before the provider is called: a crash between the response
 * and the write cannot lose the act, and a second request cannot reach the PAC.
 * When the provider refuses, the row returns to `issued` with the reason recorded
 * rather than staying pending forever.
 */
export class CancelInvoice {
  private readonly deps: CancelInvoiceDependencies;

  constructor(deps: CancelInvoiceDependencies) {
    this.deps = deps;
  }

  async execute(command: CancelInvoiceCommand): Promise<CfdiInvoice> {
    const now = this.deps.now?.() ?? new Date();
    const invoice = await this.deps.invoices.getByIdForAccount(
      command.accountId,
      command.invoiceId,
    );

    if (invoice === null) {
      throw new NotFoundError("Invoice not found");
    }

    if (invoice.status !== "issued") {
      throw new ConflictError(
        `Only an issued invoice can be cancelled (current status: ${invoice.status})`,
      );
    }

    if (!isWithinCancellationWindow(invoice.createdAt, now)) {
      const deadline = cancellationDeadline(invoice.createdAt);

      throw new ValidationError(
        `The cancellation window for this invoice closed in ${deadline.month}/${deadline.year}`,
      );
    }

    if (invoice.providerId === null) {
      throw new DataIntegrityError("providerId", invoice.providerId);
    }

    const claimed = await this.deps.invoices.markCancellationRequested({
      id: invoice.id,
      accountId: command.accountId,
      motive: command.motive,
      requestedAt: now,
    });

    // The compare-and-set lost: someone else already claimed this invoice.
    if (!claimed) {
      throw new ConflictError("This invoice is already being cancelled");
    }

    let result: InvoiceCancellationResult;

    try {
      result = await this.deps.canceller.cancel({
        providerId: invoice.providerId,
        motive: command.motive,
      });
    } catch (error) {
      if (error instanceof InvoiceProviderRejection) {
        // The request never happened, so the invoice is not being cancelled.
        await this.deps.invoices.recordCancellationOutcome({
          id: invoice.id,
          accountId: command.accountId,
          status: "issued",
          resolvedAt: now,
          expiresAt: null,
          detail: error.detail,
          acuseKey: null,
          updatedAt: now,
        });
      }

      throw error;
    }

    const state = cancellationStateFor(result, now);
    const acuse = await archiveAcuse({
      documents: this.deps.documents,
      accountId: command.accountId,
      invoiceUuid: invoice.uuid,
      acuseXml: result.acuseXml,
      onArchiveError: this.deps.onArchiveError,
    });

    await this.deps.invoices.recordCancellationOutcome({
      id: invoice.id,
      accountId: command.accountId,
      status: state.status,
      resolvedAt: state.resolvedAt,
      expiresAt: state.expiresAt,
      detail: mergeDetail(result.detail, acuse.warning),
      acuseKey: acuse.key,
      updatedAt: now,
    });

    const updated = await this.deps.invoices.getByIdForAccount(
      command.accountId,
      command.invoiceId,
    );

    if (updated === null) {
      throw new DataIntegrityError("invoiceId", command.invoiceId);
    }

    return updated;
  }
}
