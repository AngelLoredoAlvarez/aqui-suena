import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type { CfdiNotifier } from "@aqui-suena/api/domain/billing/invoices/ports/cfdi-notifier";
import { IssueInvoice } from "@aqui-suena/api/domain/billing/invoices/use-cases/issue-invoice";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { FacturamaInvoiceIssuer } from "@aqui-suena/api/infrastructure/billing/facturama/facturama-invoice-issuer";
import { D1CfdiInvoiceRepository } from "@aqui-suena/api/infrastructure/billing/invoices/d1-cfdi-invoice-repository";
import { R2CfdiDocumentStore } from "@aqui-suena/api/infrastructure/billing/invoices/r2-cfdi-document-store";
import { D1PaymentRepository } from "@aqui-suena/api/infrastructure/billing/payments/d1-payment-repository";
import {
  describeError,
  type FacturamaEnv,
  facturamaSettings,
  type R2Env,
  r2StorageOptions,
} from "@aqui-suena/api/server/composition/invoice/invoice-config";

export type IssueInvoiceCompositionOptions = {
  readonly db: D1Database;
  readonly account: Pick<AccountRepository, "getFiscalProfile" | "getById">;
  readonly plans: Pick<PlanRepository, "getById">;
  readonly facturama: FacturamaEnv;
  readonly r2: R2Env;
  /** Delivery is optional: without it the invoice is issued and archived only. */
  readonly notifier?: CfdiNotifier;
  readonly downloadUrl?: string;
  readonly fetch?: typeof fetch;
  readonly now?: () => Date;
};

/**
 * Builds the invoice issuing chain, or `undefined` when the deployment is not
 * configured. Both halves are required: without a PAC nothing can be stamped,
 * and without R2 there is no fiscal archive.
 */
export function createIssueInvoice(
  options: IssueInvoiceCompositionOptions,
): IssueInvoice | undefined {
  const { facturama, r2 } = options;
  const settings = facturamaSettings(facturama);
  const r2Options = r2StorageOptions(r2);

  if (settings === undefined || r2Options === undefined) {
    return undefined;
  }

  const fetchFn = options.fetch ?? fetch;

  const issuer = new FacturamaInvoiceIssuer({
    credentials: settings.credentials,
    fiscal: settings.fiscal,
    fetch: fetchFn,
  });

  return new IssueInvoice({
    fiscalProfiles: options.account,
    payments: new D1PaymentRepository(options.db),
    plans: options.plans,
    issuer,
    invoices: new D1CfdiInvoiceRepository(options.db),
    documents: new R2CfdiDocumentStore({ r2: r2Options, fetch: fetchFn }),
    accounts: options.account,
    notifier: options.notifier,
    downloadUrl: options.downloadUrl,
    now: options.now,
    onArchiveError: (error, accountId) => {
      console.error("billing: CFDI document archive failed", {
        accountId,
        error: describeError(error),
      });
    },
    onDeliveryError: (error, stage, subjectId) => {
      console.error(`billing: CFDI ${stage} delivery failed`, {
        subjectId,
        error: describeError(error),
      });
    },
  });
}
