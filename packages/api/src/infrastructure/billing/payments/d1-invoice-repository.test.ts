import { D1InvoiceRepository } from "@aqui-suena/api/infrastructure/billing/payments/d1-invoice-repository";
import { describe, expect, it } from "vitest";

describe("D1InvoiceRepository", () => {
  it("maps D1 rows into invoices (getById)", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({
            id: "inv-1",
            payment_id: "pay-1",
            account_id: "acc-1",
            plan_id: "trades",
            amount: 4900,
            currency: "MXN",
            issued_at: 1700000000,
            created_at: 1700000000,
          }),
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1InvoiceRepository(fakeDb);

    const invoice = await repo.getById("inv-1");

    expect(invoice).not.toBeNull();
    expect(invoice?.id).toBe("inv-1");
    expect(invoice?.paymentId).toBe("pay-1");
    expect(invoice?.accountId).toBe("acc-1");
    expect(invoice?.planId).toBe("trades");
    expect(invoice?.amount).toBe(4900);
    expect(invoice?.issuedAt).toBeInstanceOf(Date);
  });

  it("returns null for non-existent invoice (getById)", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1InvoiceRepository(fakeDb);

    const invoice = await repo.getById("non-existent");

    expect(invoice).toBeNull();
  });

  it("returns invoice by payment (getByPayment)", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({
            id: "inv-1",
            payment_id: "pay-1",
            account_id: "acc-1",
            plan_id: "trades",
            amount: 4900,
            currency: "MXN",
            issued_at: 1700000000,
            created_at: 1700000000,
          }),
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1InvoiceRepository(fakeDb);

    const invoice = await repo.getByPayment("pay-1");

    expect(invoice).not.toBeNull();
    expect(invoice?.paymentId).toBe("pay-1");
  });

  it("returns null when no invoice for payment (getByPayment)", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1InvoiceRepository(fakeDb);

    const invoice = await repo.getByPayment("non-existent");

    expect(invoice).toBeNull();
  });

  it("creates an invoice (create)", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1InvoiceRepository(fakeDb);

    const invoice = await repo.create("pay-1", "acc-1", "trades", 4900, "MXN");

    expect(invoice.paymentId).toBe("pay-1");
    expect(invoice.accountId).toBe("acc-1");
    expect(invoice.planId).toBe("trades");
    expect(invoice.amount).toBe(4900);
    expect(invoice.currency).toBe("MXN");
    expect(invoice.id).toBeTruthy();
    expect(invoice.issuedAt).toBeInstanceOf(Date);
  });
});
