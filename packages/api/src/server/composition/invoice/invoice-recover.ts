import { RecoverMissingArchives } from "@aqui-suena/api/domain/billing/invoices/use-cases/recover-missing-archives";
import { FacturamaInvoiceIssuer } from "@aqui-suena/api/infrastructure/billing/facturama/facturama-invoice-issuer";
import { D1CfdiInvoiceRepository } from "@aqui-suena/api/infrastructure/billing/invoices/d1-cfdi-invoice-repository";
import { R2CfdiDocumentStore } from "@aqui-suena/api/infrastructure/billing/invoices/r2-cfdi-document-store";
import {
  describeError,
  type FacturamaEnv,
  facturamaSettings,
  type R2Env,
  r2StorageOptions,
} from "@aqui-suena/api/server/composition/invoice/invoice-config";

export type RecoverMissingArchivesCompositionOptions = {
  readonly db: D1Database;
  readonly facturama: FacturamaEnv;
  readonly r2: R2Env;
  readonly fetch?: typeof fetch;
  readonly now?: () => Date;
};

/**
 * Builds the fiscal-archive recovery sweep, or `undefined` when the deployment
 * cannot reach the PAC or R2: recovering a document needs both ends.
 */
export function createRecoverMissingArchives(
  options: RecoverMissingArchivesCompositionOptions,
): RecoverMissingArchives | undefined {
  const settings = facturamaSettings(options.facturama);
  const r2Options = r2StorageOptions(options.r2);

  if (settings === undefined || r2Options === undefined) {
    return undefined;
  }

  const fetchFn = options.fetch ?? fetch;

  return new RecoverMissingArchives({
    invoices: new D1CfdiInvoiceRepository(options.db),
    provider: new FacturamaInvoiceIssuer({
      credentials: settings.credentials,
      fiscal: settings.fiscal,
      fetch: fetchFn,
    }),
    documents: new R2CfdiDocumentStore({ r2: r2Options, fetch: fetchFn }),
    now: options.now,
    onError: (error, invoiceId, stage) => {
      console.error(`billing: CFDI ${stage} archive recovery failed`, {
        invoiceId,
        error: describeError(error),
      });
    },
  });
}
