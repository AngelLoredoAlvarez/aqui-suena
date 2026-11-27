import {
  CancelInvoice,
  type InvoiceSubstituter,
} from "@aqui-suena/api/domain/billing/invoices/use-cases/cancel-invoice";
import type { IssueInvoice } from "@aqui-suena/api/domain/billing/invoices/use-cases/issue-invoice";
import { ReconcileCancellations } from "@aqui-suena/api/domain/billing/invoices/use-cases/reconcile-cancellations";
import { FacturamaInvoiceCanceller } from "@aqui-suena/api/infrastructure/billing/facturama/facturama-invoice-canceller";
import { D1CfdiInvoiceRepository } from "@aqui-suena/api/infrastructure/billing/invoices/d1-cfdi-invoice-repository";
import { R2CfdiDocumentStore } from "@aqui-suena/api/infrastructure/billing/invoices/r2-cfdi-document-store";
import {
  describeError,
  type FacturamaEnv,
  facturamaSettings,
  type R2Env,
  r2StorageOptions,
} from "@aqui-suena/api/server/composition/invoice/invoice-config";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";

export type CancelInvoiceCompositionOptions = {
  readonly db: D1Database;
  readonly facturama: FacturamaEnv;
  readonly r2: R2Env;
  /** Required for motive `01`: the replacement is stamped before cancelling. */
  readonly issueInvoice?: Pick<IssueInvoice, "execute">;
  readonly fetch?: typeof fetch;
  readonly now?: () => Date;
};

export type CancellationChain = {
  readonly cancelInvoice: CancelInvoice;
  readonly reconcile: ReconcileCancellations;
};

/**
 * Adapts the issuing use case to the cancellation port. A stamped CFDI always
 * has a UUID; a null one means the row is inconsistent, not that the fiscal act
 * can continue.
 */
export function createInvoiceSubstituter(
  issueInvoice: Pick<IssueInvoice, "execute">,
): InvoiceSubstituter {
  return {
    issue: async (input) => {
      const invoice = await issueInvoice.execute(input.accountId, {
        paymentId: input.paymentId,
        substitutesUuid: input.substitutesUuid,
      });

      if (invoice.uuid === null) {
        throw new DataIntegrityError("uuid", invoice.uuid);
      }

      return { uuid: invoice.uuid };
    },
  };
}

/**
 * Builds the cancellation chain, or `undefined` when the deployment cannot
 * cancel. R2 is required as well: cancelling without keeping the acuse would
 * leave the fiscal proof nowhere.
 */
export function createCancelInvoice(
  options: CancelInvoiceCompositionOptions,
): CancellationChain | undefined {
  const settings = facturamaSettings(options.facturama);
  const r2Options = r2StorageOptions(options.r2);

  if (settings === undefined || r2Options === undefined) {
    return undefined;
  }

  const fetchFn = options.fetch ?? fetch;

  const canceller = new FacturamaInvoiceCanceller({
    credentials: settings.credentials,
    fiscal: settings.fiscal,
    fetch: fetchFn,
  });

  const documents = new R2CfdiDocumentStore({ r2: r2Options, fetch: fetchFn });
  const invoices = new D1CfdiInvoiceRepository(options.db);
  const { issueInvoice } = options;

  return {
    cancelInvoice: new CancelInvoice({
      invoices,
      canceller,
      documents,
      substituter: issueInvoice === undefined ? undefined : createInvoiceSubstituter(issueInvoice),
      now: options.now,
      onArchiveError: (error, accountId) => {
        console.error("billing: CFDI acuse archive failed", {
          accountId,
          error: describeError(error),
        });
      },
      onStateError: (error, invoiceId) => {
        console.error("billing: CFDI claim release failed", {
          invoiceId,
          error: describeError(error),
        });
      },
    }),
    reconcile: new ReconcileCancellations({
      invoices,
      canceller,
      documents,
      now: options.now,
      onError: (error, invoiceId) => {
        console.error("billing: CFDI cancellation reconcile failed", {
          invoiceId,
          error: describeError(error),
        });
      },
    }),
  };
}
