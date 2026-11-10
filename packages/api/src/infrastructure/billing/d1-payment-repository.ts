import type {
  Payment,
  PaymentRepository,
  PaymentStatus,
} from "@aqui-suena/api/domain/billing/payments/payments";
import { fromEpoch, toEpoch } from "@aqui-suena/api/infrastructure/shared/d1-epoch";

type PaymentRow = {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: number | null;
  created_at: number;
  updated_at: number;
};

export class D1PaymentRepository implements PaymentRepository {
  constructor(private readonly db: D1Database) {}

  async create(subscriptionId: string, amount: number, currency: string): Promise<Payment> {
    const id = crypto.randomUUID();

    const now = new Date();

    await this.db
      .prepare(
        "INSERT INTO payments (id, subscription_id, amount, currency, status, paid_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', NULL, ?, ?)",
      )
      .bind(id, subscriptionId, amount, currency, toEpoch(now), toEpoch(now))
      .run();

    return {
      id,
      subscriptionId,
      amount,
      currency,
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
        "SELECT id, subscription_id, amount, currency, status, paid_at, created_at, updated_at FROM payments WHERE subscription_id = ? ORDER BY created_at DESC",
      )
      .bind(subscriptionId)
      .all();

    return result.results.map((row) => this.mapRow(row as PaymentRow));
  }

  async getById(id: string): Promise<Payment | null> {
    const row = await this.db
      .prepare(
        "SELECT id, subscription_id, amount, currency, status, paid_at, created_at, updated_at FROM payments WHERE id = ?",
      )
      .bind(id)
      .first();

    return row ? this.mapRow(row as PaymentRow) : null;
  }

  private mapRow(row: PaymentRow): Payment {
    return {
      id: row.id,
      subscriptionId: row.subscription_id,
      amount: row.amount,
      currency: row.currency,
      status: row.status as PaymentStatus,
      paidAt: fromEpoch(row.paid_at),
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
    };
  }
}
