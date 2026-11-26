import { D1CfdiInvoiceRepository } from "@aqui-suena/api/infrastructure/billing/invoices/d1-cfdi-invoice-repository";
import { R2CfdiDocumentStore } from "@aqui-suena/api/infrastructure/billing/invoices/r2-cfdi-document-store";
import { createInvoiceHistory } from "@aqui-suena/api/server/composition/invoice/invoice-history";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

const r2 = {
  accountId: "acc-1",
  accessKeyId: "key",
  secretAccessKey: "secret",
};

describe("createInvoiceHistory", () => {
  it("always wires the invoice repository", () => {
    const history = createInvoiceHistory({
      db: new FakeD1Database().db,
      r2: {},
    });

    expect(history.invoices).toBeInstanceOf(D1CfdiInvoiceRepository);
  });

  it("omits the document linker when R2 is unconfigured", () => {
    const history = createInvoiceHistory({
      db: new FakeD1Database().db,
      r2: {},
    });

    expect(history.documents).toBeUndefined();
  });

  it("wires the document store when R2 is configured", () => {
    const history = createInvoiceHistory({
      db: new FakeD1Database().db,
      r2,
      fetch: async () => new Response(null, { status: 200 }),
    });

    expect(history.documents).toBeInstanceOf(R2CfdiDocumentStore);
  });
});
