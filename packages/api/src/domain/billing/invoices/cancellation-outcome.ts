import type { CfdiInvoiceStatus } from "@aqui-suena/api/domain/billing/invoices/invoice";
import type { InvoiceCancellationResult } from "@aqui-suena/api/domain/billing/invoices/invoice-canceller";

export type CancellationState = {
  readonly status: CfdiInvoiceStatus;
  readonly resolvedAt: Date | null;
  readonly expiresAt: Date | null;
};

/**
 * Where a provider outcome leaves the row. Shared by the request path and the
 * reconciliation path so both agree: a cancellation reported by a later read must
 * land in exactly the same state as one reported immediately.
 *
 * `not_cancellable` returns to `issued` because it was never a rejection, and
 * `pending` keeps the receiver deadline instead of a resolution date.
 */
export function cancellationStateFor(
  result: InvoiceCancellationResult,
  now: Date,
): CancellationState {
  switch (result.outcome) {
    case "cancelled":
      return { status: "cancelled", resolvedAt: result.resolvedAt ?? now, expiresAt: null };
    case "pending":
      return {
        status: "cancellation_pending",
        resolvedAt: null,
        expiresAt: result.expiresAt,
      };
    case "rejected":
      return {
        status: "cancellation_rejected",
        resolvedAt: result.resolvedAt ?? now,
        expiresAt: null,
      };
    case "not_cancellable":
      return { status: "issued", resolvedAt: now, expiresAt: null };
  }
}
