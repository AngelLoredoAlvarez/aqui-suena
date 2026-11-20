import {
  type CfdiInvoice,
  InMemoryCfdiInvoiceRepository,
} from "@aqui-suena/api/domain/billing/invoices/invoice";
import { describe, expect, it } from "vitest";

function timestamp(minute: number): Date {
  return new Date(1_700_000_000_000 + minute * 60_000);
}

function invoice(overrides: Partial<CfdiInvoice> = {}): CfdiInvoice {
  return {
    id: "inv-1",
    accountId: "acc-1",
    paymentId: "pay-1",
    status: "issued",
    uuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
    providerId: "fac-1",
    xmlKey: null,
    pdfKey: null,
    failureReason: null,
    cancellationMotive: null,
    cancellationRequestedAt: null,
    cancellationResolvedAt: null,
    cancellationExpiresAt: null,
    cancellationDetail: null,
    acuseKey: null,
    substitutionUuid: null,
    createdAt: timestamp(0),
    updatedAt: timestamp(0),
    ...overrides,
  };
}

describe("InMemoryCfdiInvoiceRepository archive recovery", () => {
  it("lists only settled rows that still owe a document, oldest attempt first", async () => {
    const repository = new InMemoryCfdiInvoiceRepository([
      invoice({ id: "b", updatedAt: timestamp(2) }),
      invoice({ id: "a", updatedAt: timestamp(1) }),
      invoice({ id: "complete", xmlKey: "cfdi/acc-1/a.xml", pdfKey: "cfdi/acc-1/a.pdf" }),
      invoice({ id: "failed", status: "failed", providerId: null }),
      invoice({ id: "no-provider", providerId: null }),
      invoice({ id: "pending", status: "cancellation_pending" }),
    ]);

    const listed = await repository.listMissingArchivesForAllAccounts({ limit: 10 });

    expect(listed.map((row) => row.id)).toEqual(["a", "b"]);
  });

  it("records only the recovered keys and stamps the attempt", async () => {
    const row = invoice({ pdfKey: "cfdi/acc-1/kept.pdf" });

    const repository = new InMemoryCfdiInvoiceRepository([row]);

    await repository.recordArchiveAttempt({
      id: row.id,
      accountId: row.accountId,
      xmlKey: "cfdi/acc-1/recovered.xml",
      pdfKey: null,
      attemptedAt: timestamp(5),
    });

    expect(row.xmlKey).toBe("cfdi/acc-1/recovered.xml");
    expect(row.pdfKey).toBe("cfdi/acc-1/kept.pdf");
    expect(row.updatedAt).toEqual(timestamp(5));
  });
});
