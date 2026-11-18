import {
  type NewPayment,
  type Payment,
  type PaymentRepository,
  type PaymentStatus,
  parsePaymentStatus,
} from "@aqui-suena/api/domain/billing/payments/payment";
import { parsePlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { fromEpoch, toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";

type PaymentRow = {
  id: string;
  subscription_id: string;
  plan_id: string | null;
  amount: number;
  currency: string;
  status: string;
  paid_at: number | null;
  created_at: number;
  updated_at: number;
};

export class D1PaymentRepository implements PaymentRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: NewPayment): Promise<Payment> {
    const id = crypto.randomUUID();
    const now = new Date();

    await this.db
      .prepare(
        `INSERT INTO payments (id, subscription_id, plan_id, amount, currency, status, paid_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?, ?)`,
      )
      .bind(
        id,
        input.subscriptionId,
        input.planId,
        input.amount,
        input.currency,
        toEpoch(now),
        toEpoch(now),
      )
      .run();

    return {
      id,
      subscriptionId: input.subscriptionId,
      planId: input.planId,
      amount: input.amount,
      currency: input.currency,
      status: "pending",
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateStatus(id: string, status: PaymentStatus, paidAt?: Date): Promise<void> {
    const now = new Date();

    await this.db
      .prepare("UPDATE payments SET status = ?, paid_at = ?, updated_at = ? WHERE id = ?")
      .bind(status, paidAt ? toEpoch(paidAt) : null, toEpoch(now), id)
      .run();
  }

  async listBySubscription(subscriptionId: string): Promise<Payment[]> {
    const result = await this.db
      .prepare(
        `SELECT id, subscription_id, plan_id, amount, currency, status, paid_at, created_at, updated_at
        FROM payments
        WHERE subscription_id = ?
        ORDER BY created_at DESC`,
      )
      .bind(subscriptionId)
      .all();

    return result.results.map((row) => this.mapRow(row as PaymentRow));
  }

  async getById(id: string): Promise<Payment | null> {
    const row = await this.db
      .prepare(
        `SELECT id, subscription_id, plan_id, amount, currency, status, paid_at, created_at, updated_at
        FROM payments
        WHERE id = ?`,
      )
      .bind(id)
      .first();

    return row ? this.mapRow(row as PaymentRow) : null;
  }

  private mapRow(row: PaymentRow): Payment {
    return {
      id: row.id,
      subscriptionId: row.subscription_id,
      planId: row.plan_id === null ? null : parsePlanId(row.plan_id),
      amount: row.amount,
      currency: row.currency,
      status: parsePaymentStatus(row.status),
      paidAt: fromEpoch(row.paid_at),
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
    };
  }
}
