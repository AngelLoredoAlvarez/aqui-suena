import { cancellationStateFor } from "@aqui-suena/api/domain/billing/invoices/cancellation-outcome";
import type { InvoiceCancellationResult } from "@aqui-suena/api/domain/billing/invoices/invoice-canceller";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-11-26T12:00:00Z");

function result(overrides: Partial<InvoiceCancellationResult>): InvoiceCancellationResult {
  return {
    outcome: "cancelled",
    providerStatus: "canceled",
    detail: null,
    expiresAt: null,
    resolvedAt: new Date("2026-11-26T11:00:00Z"),
    acuseXml: null,
    ...overrides,
  };
}

describe("cancellationStateFor", () => {
  it("closes a cancelled invoice with the provider resolution date", () => {
    const resolvedAt = new Date("2026-11-26T11:00:00Z");

    expect(cancellationStateFor(result({ outcome: "cancelled", resolvedAt }), NOW)).toEqual({
      status: "cancelled",
      resolvedAt,
      expiresAt: null,
    });
  });

  it("falls back to now when the provider reports no resolution date", () => {
    expect(cancellationStateFor(result({ outcome: "cancelled", resolvedAt: null }), NOW)).toEqual({
      status: "cancelled",
      resolvedAt: NOW,
      expiresAt: null,
    });
  });

  it("keeps a pending cancellation open with the receiver deadline", () => {
    const expiresAt = new Date("2026-11-29T12:00:00Z");

    expect(
      cancellationStateFor(result({ outcome: "pending", expiresAt, resolvedAt: null }), NOW),
    ).toEqual({
      status: "cancellation_pending",
      resolvedAt: null,
      expiresAt,
    });
  });

  it("closes a rejected cancellation with the provider resolution date", () => {
    const resolvedAt = new Date("2026-11-26T11:00:00Z");

    expect(cancellationStateFor(result({ outcome: "rejected", resolvedAt }), NOW)).toEqual({
      status: "cancellation_rejected",
      resolvedAt,
      expiresAt: null,
    });
  });

  it("returns a not-cancellable invoice to issued without a rejection", () => {
    expect(
      cancellationStateFor(result({ outcome: "not_cancellable", resolvedAt: null }), NOW),
    ).toEqual({
      status: "issued",
      resolvedAt: NOW,
      expiresAt: null,
    });
  });
});
