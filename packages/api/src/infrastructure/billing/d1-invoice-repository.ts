import type { PlanId } from "@aqui-suena/api/domain/billing/catalog/entitlements";
import type { Invoice, InvoiceRepository } from "@aqui-suena/api/domain/billing/payments/payments";
import { toEpoch } from "@aqui-suena/api/infrastructure/shared/d1-epoch";

type InvoiceRow = {
  id: string;
  payment_id: string;
  account_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  issued_at: number;
  created_at: number;
};

export class D1InvoiceRepository implements InvoiceRepository {
  constructor(private readonly db: D1Database) {}

  async create(
    paymentId: string,
    accountId: string,
    planId: PlanId,
    amount: number,
    currency: string,
  ): Promise<Invoice> {
    const id = crypto.randomUUID();

    const now = new Date();

    await this.db
      .prepare(
        "INSERT INTO invoices (id, payment_id, account_id, plan_id, amount, currency, issued_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(id, paymentId, accountId, planId, amount, currency, toEpoch(now), toEpoch(now))
      .run();

    return {
      id,
      paymentId,
      accountId,
      planId,
      amount,
      currency,
      issuedAt: now,
      createdAt: now,
    };
  }

  async getById(id: string): Promise<Invoice | null> {
    const row = await this.db
      .prepare(
        "SELECT id, payment_id, account_id, plan_id, amount, currency, issued_at, created_at FROM invoices WHERE id = ?",
      )
      .bind(id)
      .first();

    return row ? this.mapRow(row as InvoiceRow) : null;
  }

  async getByPayment(paymentId: string): Promise<Invoice | null> {
    const row = await this.db
      .prepare(
        "SELECT id, payment_id, account_id, plan_id, amount, currency, issued_at, created_at FROM invoices WHERE payment_id = ?",
      )
      .bind(paymentId)
      .first();

    return row ? this.mapRow(row as InvoiceRow) : null;
  }

  async listByAccount(accountId: string): Promise<Invoice[]> {
    const result = await this.db
      .prepare(
        "SELECT id, payment_id, account_id, plan_id, amount, currency, issued_at, created_at FROM invoices WHERE account_id = ? ORDER BY issued_at DESC",
      )
      .bind(accountId)
      .all();

    return result.results.map((row) => this.mapRow(row as InvoiceRow));
  }

  private mapRow(row: InvoiceRow): Invoice {
    return {
      id: row.id,
      paymentId: row.payment_id,
      accountId: row.account_id,
      planId: row.plan_id as PlanId,
      amount: row.amount,
      currency: row.currency,
      issuedAt: new Date(row.issued_at * 1000),
      createdAt: new Date(row.created_at * 1000),
    };
  }
}
