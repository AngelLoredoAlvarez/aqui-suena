import type {
  CfdiDocumentLinker,
  CfdiInvoiceRepository,
} from "@aqui-suena/api/domain/billing/invoices/model/invoice";
import { D1CfdiInvoiceRepository } from "@aqui-suena/api/infrastructure/billing/invoices/d1-cfdi-invoice-repository";
import { R2CfdiDocumentStore } from "@aqui-suena/api/infrastructure/billing/invoices/r2-cfdi-document-store";
import { type R2Env, r2StorageOptions } from "@aqui-suena/api/server/composition/invoice-config";

export type InvoiceHistoryComposition = {
  readonly invoices: CfdiInvoiceRepository;
  /** Absent when R2 is unconfigured: listing still works, downloads answer 412. */
  readonly documents?: CfdiDocumentLinker;
};

/**
 * Builds the read side of billing. Listing only needs D1; signing a download
 * needs R2, so a deployment without storage keeps the history and loses only the
 * downloads.
 */
export function createInvoiceHistory(options: {
  readonly db: D1Database;
  readonly r2: R2Env;
  readonly fetch?: typeof fetch;
}): InvoiceHistoryComposition {
  const invoices = new D1CfdiInvoiceRepository(options.db);
  const r2Options = r2StorageOptions(options.r2);

  if (r2Options === undefined) {
    return { invoices };
  }

  const store = new R2CfdiDocumentStore({
    r2: r2Options,
    fetch: options.fetch ?? fetch,
  });

  return { invoices, documents: store };
}
