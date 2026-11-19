import type { FiscalProfile } from "@aqui-suena/api/domain/accounts/fiscal-profile";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { DomainError } from "@aqui-suena/api/shared/domain-error";

/** SAT payment form codes the checkout can produce. */
export type InvoicePaymentForm = "01" | "03" | "04";

export type IssueInvoiceRequest = {
  readonly accountId: string;
  readonly planId: PlanId;
  readonly planName: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly fiscalProfile: FiscalProfile;
  readonly issuedAt: Date;
  readonly paymentForm: InvoicePaymentForm;
};

export type IssuedCfdi = {
  readonly providerId: string;
  readonly uuid: string;
  readonly xml: string;
};

/**
 * Port for a PAC (Proveedor Autorizado de Certificación). Adapters speak the
 * provider protocol; the domain only knows "issue this request".
 */
export interface InvoiceIssuer {
  issue(request: IssueInvoiceRequest): Promise<IssuedCfdi>;
  /** PDF of an already stamped CFDI, addressed by the provider id. */
  downloadPdf(providerId: string): Promise<Uint8Array>;
}

/**
 * The PAC rejected the request. It is a domain error so the transport maps it
 * once; `detail` is the provider message and is never sent to the client.
 */
export class InvoiceProviderRejection extends DomainError {
  readonly detail: string;

  constructor(detail: string) {
    super("The invoice provider rejected the request");
    this.name = "InvoiceProviderRejection";
    this.detail = detail;
  }
}
