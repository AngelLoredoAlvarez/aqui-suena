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
      cancellationMotive: null,
      cancellationRequestedAt: null,
      cancellationResolvedAt: null,
      cancellationExpiresAt: null,
      cancellationDetail: null,
      acuseKey: null,
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
      // cancellation fields: motive, requested, resolved, expires, detail, acuse
      null,
      null,
      null,
      null,
      null,
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
      cancellationMotive: null,
      cancellationRequestedAt: null,
      cancellationResolvedAt: null,
      cancellationExpiresAt: null,
      cancellationDetail: null,
      acuseKey: null,
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
      null,
      null,
      null,
      null,
      null,
      null,
      toEpoch(invoice.createdAt),
      toEpoch(invoice.updatedAt),
    ]);
  });

  it("lists every invoice of the account except failed ones, newest first", async () => {
    const db = new FakeD1Database(() => ({
      all: [
        {
          id: "inv-2",
          account_id: "acc-1",
          payment_id: null,
          status: "issued",
          uuid: "uuid-2",
          provider_id: "fac-2",
          xml_key: "cfdi/acc-1/2.xml",
          pdf_key: "cfdi/acc-1/2.pdf",
          failure_reason: null,
          created_at: 1_700_000_200,
          updated_at: 1_700_000_200,
        },
        {
          id: "inv-1",
          account_id: "acc-1",
          payment_id: null,
          status: "issued",
          uuid: "uuid-1",
          provider_id: "fac-1",
          xml_key: null,
          pdf_key: null,
          failure_reason: null,
          created_at: 1_700_000_100,
          updated_at: 1_700_000_100,
        },
      ],
    }));

    const page = await new D1CfdiInvoiceRepository(db.db).listByAccount({
      accountId: "acc-1",
      limit: 20,
      offset: 0,
    });

    expect(page.items.map((item) => item.id)).toEqual(["inv-2", "inv-1"]);
    expect(page.items[0]?.createdAt).toEqual(new Date(1_700_000_200_000));
    expect(page.nextOffset).toBeNull();
    expect(normalizeSql(db.statements[0]?.sql)).toContain(
      "WHERE account_id = ? AND status <> 'failed' ORDER BY created_at DESC, id DESC",
    );
    expect(db.statements[0]?.params).toEqual(["acc-1", 20, 0]);
  });

  it("returns a page cursor when the page is full", async () => {
    const row = {
      id: "inv-1",
      account_id: "acc-1",
      payment_id: null,
      status: "issued",
      uuid: "uuid-1",
      provider_id: "fac-1",
      xml_key: "cfdi/acc-1/1.xml",
      pdf_key: "cfdi/acc-1/1.pdf",
      failure_reason: null,
      created_at: 1_700_000_000,
      updated_at: 1_700_000_000,
    };
    const db = new FakeD1Database(() => ({ all: [row] }));

    const page = await new D1CfdiInvoiceRepository(db.db).listByAccount({
      accountId: "acc-1",
      limit: 1,
      offset: 0,
    });

    expect(page.nextOffset).toBe(1);
  });

  it("scopes a single invoice lookup to its account, whatever its status", async () => {
    const db = new FakeD1Database(() => ({
      first: {
        id: "inv-1",
        account_id: "acc-1",
        payment_id: null,
        status: "issued",
        uuid: "uuid-1",
        provider_id: "fac-1",
        xml_key: "cfdi/acc-1/1.xml",
        pdf_key: "cfdi/acc-1/1.pdf",
        failure_reason: null,
        created_at: 1_700_000_000,
        updated_at: 1_700_000_000,
      },
    }));

    const invoice = await new D1CfdiInvoiceRepository(db.db).getByIdForAccount("acc-1", "inv-1");

    expect(invoice).toMatchObject({ id: "inv-1", accountId: "acc-1", status: "issued" });
    expect(normalizeSql(db.statements[0]?.sql)).toContain("WHERE id = ? AND account_id = ?");
    expect(db.statements[0]?.params).toEqual(["inv-1", "acc-1"]);
  });

  it("answers null for an invoice of another account", async () => {
    const db = new FakeD1Database(() => ({ first: null }));

    await expect(
      new D1CfdiInvoiceRepository(db.db).getByIdForAccount("acc-2", "inv-1"),
    ).resolves.toBeNull();
  });
});
