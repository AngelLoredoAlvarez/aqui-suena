import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import { IssueInvoice } from "@aqui-suena/api/domain/billing/invoices/issue-invoice";
import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { FacturamaInvoiceIssuer } from "@aqui-suena/api/infrastructure/billing/facturama/facturama-invoice-issuer";
import { D1CfdiInvoiceRepository } from "@aqui-suena/api/infrastructure/billing/invoices/d1-cfdi-invoice-repository";
import { R2CfdiXmlStore } from "@aqui-suena/api/infrastructure/billing/invoices/r2-cfdi-xml-store";
import type { R2ObjectStorageOptions } from "@aqui-suena/api/infrastructure/media/r2-client";

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
  readonly expeditionPlace?: string;
  readonly ivaRate?: number;
  readonly productCode?: string;
  readonly unitCode?: string;
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
  readonly account: Pick<AccountRepository, "getFiscalProfile">;
  readonly subscriptions: SubscriptionRepository;
  readonly plans: Pick<PlanRepository, "getById">;
  readonly facturama: FacturamaEnv;
  readonly r2: R2Env;
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

  if (
    !facturama.user ||
    !facturama.password ||
    !facturama.baseUrl ||
    !facturama.expeditionPlace ||
    !r2.accountId ||
    !r2.accessKeyId ||
    !r2.secretAccessKey
  ) {
    return undefined;
  }

  const ivaRate = facturama.ivaRate ?? DEFAULT_IVA_RATE;

  if (!(ivaRate > 0 && ivaRate < 1)) {
    return undefined;
  }

  const fetchFn = options.fetch ?? fetch;

  const issuer = new FacturamaInvoiceIssuer({
    credentials: {
      user: facturama.user,
      password: facturama.password,
      baseUrl: facturama.baseUrl,
    },
    fiscal: {
      expeditionPlace: facturama.expeditionPlace,
      ivaRate,
      productCode: facturama.productCode ?? DEFAULT_PRODUCT_CODE,
      unitCode: facturama.unitCode ?? DEFAULT_UNIT_CODE,
    },
    fetch: fetchFn,
  });

  const r2Options: R2ObjectStorageOptions = {
    accountId: r2.accountId,
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    bucketName: r2.bucketName ?? DEFAULT_BUCKET,
    endpoint: r2.endpoint,
  };

  return new IssueInvoice({
    fiscalProfiles: options.account,
    subscriptions: options.subscriptions,
    plans: options.plans,
    issuer,
    invoices: new D1CfdiInvoiceRepository(options.db),
    xml: new R2CfdiXmlStore({ r2: r2Options, fetch: fetchFn }),
    now: options.now,
  });
}
