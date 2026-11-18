import type { CfdiCancellationMotive } from "@aqui-suena/api/domain/billing/invoices/invoice";

/**
 * What the provider reports about a cancellation, normalised.
 *
 * The PAC speaks its own vocabulary — `canceled`, `acepted`, `expired`,
 * `rejected`, `active` — and three of those mean the same thing to us. Keeping
 * the provider's spelling in the domain would spread that dialect through every
 * caller, so the port speaks these four outcomes instead.
 */
export const INVOICE_CANCELLATION_OUTCOMES = [
  "cancelled",
  "pending",
  "rejected",
  "not_cancellable",
] as const;

export type InvoiceCancellationOutcome = (typeof INVOICE_CANCELLATION_OUTCOMES)[number];

export type CancelInvoiceRequest = {
  readonly providerId: string;
  readonly motive: CfdiCancellationMotive;
  /** Required by the PAC for motive 01; phase 2 supplies it. */
  readonly substitutionUuid?: string;
};

export type InvoiceCancellationResult = {
  readonly outcome: InvoiceCancellationOutcome;
  /** The provider's own status, kept verbatim for the audit trail. */
  readonly providerStatus: string;
  /** Provider message or acuse detail, shown to nobody but kept for disputes. */
  readonly detail: string | null;
  /** Last moment the receiver may answer; null unless the outcome is pending. */
  readonly expiresAt: Date | null;
  /** When the provider resolved it, when it did. */
  readonly resolvedAt: Date | null;
  /** Decoded acuse XML, the fiscal proof. Absent while pending. */
  readonly acuseXml: string | null;
};

/**
 * Port for cancelling a stamped CFDI and for asking the provider what happened.
 * Cancelling is asynchronous in the real world: the request and the resolution
 * are two different questions, which is why both live here.
 */
export interface InvoiceCanceller {
  cancel(request: CancelInvoiceRequest): Promise<InvoiceCancellationResult>;
  /** Reconciliation read: same shape, no side effect. */
  cancellationStatus(providerId: string): Promise<InvoiceCancellationResult>;
}
