import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type {
  CfdiDocumentLinker,
  CfdiInvoiceRepository,
} from "@aqui-suena/api/domain/billing/invoices/model/invoice";
import type { CfdiNotifier } from "@aqui-suena/api/domain/billing/invoices/ports/cfdi-notifier";
import {
  CancelInvoice,
  type InvoiceSubstituter,
} from "@aqui-suena/api/domain/billing/invoices/use-cases/cancel-invoice";
import { IssueInvoice } from "@aqui-suena/api/domain/billing/invoices/use-cases/issue-invoice";
import { ReconcileCancellations } from "@aqui-suena/api/domain/billing/invoices/use-cases/reconcile-cancellations";
import { RecoverMissingArchives } from "@aqui-suena/api/domain/billing/invoices/use-cases/recover-missing-archives";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { FacturamaInvoiceCanceller } from "@aqui-suena/api/infrastructure/billing/facturama/facturama-invoice-canceller";
import { FacturamaInvoiceIssuer } from "@aqui-suena/api/infrastructure/billing/facturama/facturama-invoice-issuer";
import { D1CfdiInvoiceRepository } from "@aqui-suena/api/infrastructure/billing/invoices/d1-cfdi-invoice-repository";
import { R2CfdiDocumentStore } from "@aqui-suena/api/infrastructure/billing/invoices/r2-cfdi-document-store";
import { D1PaymentRepository } from "@aqui-suena/api/infrastructure/billing/payments/d1-payment-repository";
import type { R2StorageOptions } from "@aqui-suena/api/infrastructure/r2/sigv4";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";

const DEFAULT_IVA_RATE = 0.16;
// SAT: 01010101 = no match in the catalog; replace with the real service code.
const DEFAULT_PRODUCT_CODE = "01010101";
// SAT: E48 = unit of service.
const DEFAULT_UNIT_CODE = "E48";
const DEFAULT_BUCKET = "aqui-suena-media";

export type FacturamaEnv = {
  readonly user?: string;
  readonly password?: string;
  readonly baseUrl?: string;
  readonly mode?: "web" | "multiemisor";
  readonly expeditionPlace?: string;
  readonly ivaRate?: number;
  readonly productCode?: string;
  readonly unitCode?: string;
  readonly series?: string;
  readonly issuerRfc?: string;
  readonly issuerName?: string;
  readonly issuerFiscalRegime?: string;
};

export type R2Env = {
  readonly accountId?: string;
  readonly accessKeyId?: string;
  readonly secretAccessKey?: string;
  readonly bucketName?: string;
  readonly endpoint?: string;
};

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

type FacturamaSettings = {
  readonly credentials: { user: string; password: string; baseUrl: string };
  readonly fiscal: {
    mode: "web" | "multiemisor";
    expeditionPlace: string;
    ivaRate: number;
    productCode: string;
    unitCode: string;
    series?: string;
    issuer?: { rfc: string; name: string; fiscalRegime: string };
  };
};

/**
 * Validates the PAC settings once and returns them in the shape both adapters
 * take, or `undefined` when the deployment cannot invoice at all.
 */
function facturamaSettings(facturama: FacturamaEnv): FacturamaSettings | undefined {
  if (!facturama.user || !facturama.password || !facturama.baseUrl || !facturama.expeditionPlace) {
    return undefined;
  }

  const ivaRate = facturama.ivaRate ?? DEFAULT_IVA_RATE;

  if (!(ivaRate > 0 && ivaRate < 1)) {
    return undefined;
  }

  const mode = facturama.mode ?? "web";

  if (
    mode === "multiemisor" &&
    (!facturama.issuerRfc || !facturama.issuerName || !facturama.issuerFiscalRegime)
  ) {
    return undefined;
  }

  return {
    credentials: {
      user: facturama.user,
      password: facturama.password,
      baseUrl: facturama.baseUrl,
    },
    fiscal: {
      mode,
      expeditionPlace: facturama.expeditionPlace,
      ivaRate,
      productCode: facturama.productCode ?? DEFAULT_PRODUCT_CODE,
      unitCode: facturama.unitCode ?? DEFAULT_UNIT_CODE,
      series: facturama.series,
      issuer:
        facturama.issuerRfc && facturama.issuerName && facturama.issuerFiscalRegime
          ? {
              rfc: facturama.issuerRfc,
              name: facturama.issuerName,
              fiscalRegime: facturama.issuerFiscalRegime,
            }
          : undefined,
    },
  };
}

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

  if (settings === undefined || !r2.accountId || !r2.accessKeyId || !r2.secretAccessKey) {
    return undefined;
  }

  const fetchFn = options.fetch ?? fetch;

  const issuer = new FacturamaInvoiceIssuer({
    credentials: settings.credentials,
    fiscal: settings.fiscal,
    fetch: fetchFn,
  });

  const r2Options: R2StorageOptions = {
    accountId: r2.accountId,
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    bucketName: r2.bucketName ?? DEFAULT_BUCKET,
    endpoint: r2.endpoint,
  };

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
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      });
    },
    onDeliveryError: (error, stage, subjectId) => {
      console.error(`billing: CFDI ${stage} delivery failed`, {
        subjectId,
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      });
    },
  });
}

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
  const { r2 } = options;
  const invoices = new D1CfdiInvoiceRepository(options.db);

  if (!r2.accountId || !r2.accessKeyId || !r2.secretAccessKey) {
    return { invoices };
  }

  const store = new R2CfdiDocumentStore({
    r2: {
      accountId: r2.accountId,
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
      bucketName: r2.bucketName ?? DEFAULT_BUCKET,
      endpoint: r2.endpoint,
    },
    fetch: options.fetch ?? fetch,
  });

  return { invoices, documents: store };
}

export type CancelInvoiceCompositionOptions = {
  readonly db: D1Database;
  readonly facturama: FacturamaEnv;
  readonly r2: R2Env;
  /** Required for motive `01`: the replacement is stamped before cancelling. */
  readonly issueInvoice?: Pick<IssueInvoice, "execute">;
  readonly fetch?: typeof fetch;
  readonly now?: () => Date;
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

  const { r2 } = options;

  if (settings === undefined || !r2.accountId || !r2.accessKeyId || !r2.secretAccessKey) {
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
    documents: new R2CfdiDocumentStore({
      r2: {
        accountId: r2.accountId,
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
        bucketName: r2.bucketName ?? DEFAULT_BUCKET,
        endpoint: r2.endpoint,
      },
      fetch: fetchFn,
    }),
    now: options.now,
    onError: (error, invoiceId, stage) => {
      console.error(`billing: CFDI ${stage} archive recovery failed`, {
        invoiceId,
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      });
    },
  });
}

export type CancellationChain = {
  readonly cancelInvoice: CancelInvoice;
  readonly reconcile: ReconcileCancellations;
};

/**
 * Builds the cancellation chain, or `undefined` when the deployment cannot
 * cancel. R2 is required as well: cancelling without keeping the acuse would
 * leave the fiscal proof nowhere.
 */
export function createCancelInvoice(
  options: CancelInvoiceCompositionOptions,
): CancellationChain | undefined {
  const settings = facturamaSettings(options.facturama);
  const { r2 } = options;

  if (settings === undefined || !r2.accountId || !r2.accessKeyId || !r2.secretAccessKey) {
    return undefined;
  }

  const fetchFn = options.fetch ?? fetch;

  const canceller = new FacturamaInvoiceCanceller({
    credentials: settings.credentials,
    fiscal: settings.fiscal,
    fetch: fetchFn,
  });

  const documents = new R2CfdiDocumentStore({
    r2: {
      accountId: r2.accountId,
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
      bucketName: r2.bucketName ?? DEFAULT_BUCKET,
      endpoint: r2.endpoint,
    },
    fetch: fetchFn,
  });

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
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        });
      },
      onStateError: (error, invoiceId) => {
        console.error("billing: CFDI claim release failed", {
          invoiceId,
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
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
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        });
      },
    }),
  };
}
