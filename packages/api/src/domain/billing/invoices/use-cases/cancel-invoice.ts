import {
  archiveAcuse,
  mergeDetail,
} from "@aqui-suena/api/domain/billing/invoices/model/archive-acuse";
import { cancellationStateFor } from "@aqui-suena/api/domain/billing/invoices/model/cancellation-outcome";
import {
  cancellationDeadline,
  isWithinCancellationWindow,
} from "@aqui-suena/api/domain/billing/invoices/model/cancellation-window";
import type {
  CfdiCancellationMotive,
  CfdiDocumentStore,
  CfdiInvoice,
  CfdiInvoiceRepository,
} from "@aqui-suena/api/domain/billing/invoices/model/invoice";
import type {
  InvoiceCancellationResult,
  InvoiceCanceller,
} from "@aqui-suena/api/domain/billing/invoices/ports/invoice-canceller";
import { InvoiceProviderRejection } from "@aqui-suena/api/domain/billing/invoices/ports/invoice-issuer";
import {
  ConflictError,
  DataIntegrityError,
  NotFoundError,
  ValidationError,
} from "@aqui-suena/api/shared/domain-error";

/**
 * Stamps the replacement CFDI for a motive `01` cancellation. The port keeps the
 * issuing chain out of this use case: the cron builds the cancellation chain
 * without an issuer.
 */
export interface InvoiceSubstituter {
  issue(input: {
    readonly accountId: string;
    readonly paymentId: string;
    readonly substitutesUuid: string;
  }): Promise<{ readonly uuid: string }>;
}

export type CancelInvoiceDependencies = {
  readonly invoices: CfdiInvoiceRepository;
  readonly canceller: InvoiceCanceller;
  readonly documents: CfdiDocumentStore;
  /** Required only for motive `01`; absent in the cron-only chain. */
  readonly substituter?: InvoiceSubstituter;
  readonly now?: () => Date;
  /** Reports a failed acuse archive so the loss stays diagnosable. */
  readonly onArchiveError?: (error: unknown, accountId: string) => void;
  /** Reports a failed claim release; the original error is the one rethrown. */
  readonly onStateError?: (error: unknown, invoiceId: string) => void;
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
 *
 * Motive `01` stamps a substitute CFDI between the claim and the cancellation
 * request: the replacement UUID is recorded first, so a retry reuses it and never
 * emits a second substitute.
 */
export class CancelInvoice {
  private readonly deps: CancelInvoiceDependencies;

  constructor(deps: CancelInvoiceDependencies) {
    this.deps = deps;
  }

  /**
   * Motive `01` needs a replacement stamped first, so the chain must be able to
   * issue and the invoice must point at the payment it corrects.
   */
  private substitutionRequest(
    invoice: CfdiInvoice,
    motive: CfdiCancellationMotive,
  ): { substituter: InvoiceSubstituter; paymentId: string; originalUuid: string } | null {
    if (motive !== "01") return null;

    const { substituter } = this.deps;

    if (substituter === undefined) {
      throw new ValidationError(
        "Motive 01 requires the invoice issuing chain, which is not configured",
      );
    }

    if (invoice.paymentId === null) {
      throw new ValidationError("Motive 01 requires the payment the invoice was issued for");
    }

    if (invoice.uuid === null) {
      throw new DataIntegrityError("uuid", invoice.uuid);
    }

    return { substituter, paymentId: invoice.paymentId, originalUuid: invoice.uuid };
  }

  private async releaseClaim(
    invoice: CfdiInvoice,
    accountId: string,
    now: Date,
    error: unknown,
  ): Promise<void> {
    let detail = String(error);

    if (error instanceof InvoiceProviderRejection) {
      detail = error.detail;
    } else if (error instanceof Error) {
      detail = error.message;
    }

    await this.deps.invoices
      .recordCancellationOutcome({
        id: invoice.id,
        accountId,
        status: "issued",
        resolvedAt: now,
        expiresAt: null,
        detail,
        acuseKey: null,
        updatedAt: now,
      })
      .catch((stateError: unknown) => this.deps.onStateError?.(stateError, invoice.id));
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

    const substitution = this.substitutionRequest(invoice, command.motive);

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

    let substitutionUuid: string | undefined;

    if (substitution !== null) {
      substitutionUuid = invoice.substitutionUuid ?? undefined;

      if (substitutionUuid === undefined) {
        try {
          const substitute = await substitution.substituter.issue({
            accountId: command.accountId,
            paymentId: substitution.paymentId,
            substitutesUuid: substitution.originalUuid,
          });

          substitutionUuid = substitute.uuid;
        } catch (error) {
          // Nothing reached the PAC: the original is still valid and can be
          // corrected again, so it must not stay claimed.
          await this.releaseClaim(invoice, command.accountId, now, error);
          throw error;
        }

        await this.deps.invoices.recordSubstitutionUuid({
          id: invoice.id,
          accountId: command.accountId,
          substitutionUuid,
          updatedAt: now,
        });
      }
    }

    let result: InvoiceCancellationResult;

    try {
      result = await this.deps.canceller.cancel({
        providerId: invoice.providerId,
        motive: command.motive,
        ...(substitutionUuid === undefined ? {} : { substitutionUuid }),
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
