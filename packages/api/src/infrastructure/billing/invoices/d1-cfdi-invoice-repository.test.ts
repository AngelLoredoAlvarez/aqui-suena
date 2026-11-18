import { D1CfdiInvoiceRepository } from "@aqui-suena/api/infrastructure/billing/invoices/d1-cfdi-invoice-repository";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { normalizeSql } from "@aqui-suena/api/testing/sql";
import { describe, expect, it } from "vitest";

describe("D1CfdiInvoiceRepository", () => {
  it("inserts an issued invoice with its fiscal ids and its document keys", async () => {
    const db = new FakeD1Database();

    const repository = new D1CfdiInvoiceRepository(db.db);

    const invoice = await repository.create({
      accountId: "acc-1",
      paymentId: null,
      status: "issued",
      uuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
      providerId: "fac-1",
      xmlKey: "cfdi/acc-1/1.xml",
      pdfKey: "cfdi/acc-1/1.pdf",
      failureReason: null,
    });

    expect(invoice.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(invoice).toMatchObject({
      accountId: "acc-1",
      status: "issued",
      uuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
      providerId: "fac-1",
      xmlKey: "cfdi/acc-1/1.xml",
      failureReason: null,
    });
    expect(db.statements).toHaveLength(1);
    expect(normalizeSql(db.statements[0]?.sql)).toContain("INSERT INTO cfdi_invoices");
    expect(db.statements[0]?.params).toEqual([
      invoice.id,
      "acc-1",
      null,
      "issued",
      "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
      "fac-1",
      "cfdi/acc-1/1.xml",
      "cfdi/acc-1/1.pdf",
      null,
      toEpoch(invoice.createdAt),
      toEpoch(invoice.updatedAt),
    ]);
  });

  it("inserts a failed attempt with null fiscal ids", async () => {
    const db = new FakeD1Database();

    const repository = new D1CfdiInvoiceRepository(db.db);

    const invoice = await repository.create({
      accountId: "acc-1",
      paymentId: null,
      status: "failed",
      uuid: null,
      providerId: null,
      xmlKey: null,
      pdfKey: null,
      failureReason: "El RFC del receptor no se encuentra en la lista de contribuyentes",
    });

    expect(invoice.status).toBe("failed");
    expect(db.statements[0]?.params).toEqual([
      invoice.id,
      "acc-1",
      null,
      "failed",
      null,
      null,
      null,
      null,
      "El RFC del receptor no se encuentra en la lista de contribuyentes",
      toEpoch(invoice.createdAt),
      toEpoch(invoice.updatedAt),
    ]);
  });
});
