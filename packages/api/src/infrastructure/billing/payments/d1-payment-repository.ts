import {
  type NewPayment,
  type OpenPaymentIntentQuery,
  type Payment,
  type PaymentProviderDetails,
  type PaymentRepository,
  parseBillingInterval,
  parsePaymentMethod,
  parsePaymentProvider,
  parsePaymentStatus,
} from "@aqui-suena/api/domain/billing/payments/model/payment";
import { parsePlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { fromEpoch, toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";

const COLUMNS = `id, account_id, subscription_id, plan_id, billing_interval, method, provider,
  provider_order_id, provider_charge_id, idempotency_key, amount, currency, status,
  reference, next_action_url, expires_at, failure_reason, period_start, period_end,
  paid_at, created_at, updated_at`;

type PaymentRow = {
  id: string;
  account_id: string;
  subscription_id: string | null;
  plan_id: string | null;
  billing_interval: string;
  method: string;
  provider: string;
  provider_order_id: string | null;
  provider_charge_id: string | null;
  idempotency_key: string;
  amount: number;
  currency: string;
  status: string;
  reference: string | null;
  next_action_url: string | null;
  expires_at: number | null;
  failure_reason: string | null;
  period_start: number | null;
  period_end: number | null;
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
        `INSERT INTO payments (${COLUMNS})
        VALUES (?, ?, NULL, ?, ?, ?, 'conekta', NULL, NULL, ?, ?, ?, 'pending', NULL, NULL, NULL, NULL, ?, ?, NULL, ?, ?)`,
      )
      .bind(
        id,
        input.accountId,
        input.planId,
        input.billingInterval,
        input.method,
        input.idempotencyKey,
        input.amount,
        input.currency,
        toEpoch(input.periodStart),
        toEpoch(input.periodEnd),
        toEpoch(now),
        toEpoch(now),
      )
      .run();

    return {
      id,
      accountId: input.accountId,
      subscriptionId: null,
      planId: input.planId,
      billingInterval: input.billingInterval,
      method: input.method,
      provider: "conekta",
      providerOrderId: null,
      providerChargeId: null,
      idempotencyKey: input.idempotencyKey,
      amount: input.amount,
      currency: input.currency,
      status: "pending",
      reference: null,
      nextActionUrl: null,
      expiresAt: null,
      failureReason: null,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getById(id: string): Promise<Payment | null> {
    return this.firstBy("id", id);
  }

  async getByIdempotencyKey(key: string): Promise<Payment | null> {
    return this.firstBy("idempotency_key", key);
  }

  async getByProviderOrderId(providerOrderId: string): Promise<Payment | null> {
    return this.firstBy("provider_order_id", providerOrderId);
  }

  async findOpenIntent(query: OpenPaymentIntentQuery): Promise<Payment | null> {
    const row = await this.db
      .prepare(
        `SELECT ${COLUMNS} FROM payments
        WHERE account_id = ? AND plan_id = ? AND billing_interval = ? AND method = ? AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1`,
      )
      .bind(query.accountId, query.planId, query.billingInterval, query.method)
      .first();

    return row === null || row === undefined ? null : this.mapRow(row as PaymentRow);
  }

  async applyProviderResult(id: string, details: PaymentProviderDetails): Promise<void> {
    await this.db
      .prepare(
        `UPDATE payments
        SET provider_order_id = ?, provider_charge_id = ?, reference = ?, next_action_url = ?, expires_at = ?, failure_reason = ?, updated_at = ?
        WHERE id = ?`,
      )
      .bind(
        details.providerOrderId,
        details.providerChargeId,
        details.reference,
        details.nextActionUrl,
        details.expiresAt === null ? null : toEpoch(details.expiresAt),
        details.failureReason,
        toEpoch(new Date()),
        id,
      )
      .run();
  }

  async claimCompletion(id: string, paidAt: Date): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE payments SET status = 'completed', paid_at = ?, updated_at = ?
        WHERE id = ? AND status = 'pending'`,
      )
      .bind(toEpoch(paidAt), toEpoch(new Date()), id)
      .run();

    return (result.meta?.changes ?? 0) === 1;
  }

  async markFailed(id: string, reason: string, at: Date): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE payments SET status = 'failed', failure_reason = ?, updated_at = ?
        WHERE id = ? AND status = 'pending'`,
      )
      .bind(reason, toEpoch(at), id)
      .run();

    return (result.meta?.changes ?? 0) === 1;
  }

  async markExpired(id: string, at: Date): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE payments SET status = 'expired', updated_at = ?
        WHERE id = ? AND status = 'pending'`,
      )
      .bind(toEpoch(at), id)
      .run();

    return (result.meta?.changes ?? 0) === 1;
  }

  async attachSubscription(id: string, subscriptionId: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE payments SET subscription_id = ?, updated_at = ?
        WHERE id = ? AND subscription_id IS NULL`,
      )
      .bind(subscriptionId, toEpoch(new Date()), id)
      .run();
  }

  async releaseCompletion(id: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE payments SET status = 'pending', paid_at = NULL, updated_at = ?
        WHERE id = ? AND status = 'completed' AND subscription_id IS NULL`,
      )
      .bind(toEpoch(new Date()), id)
      .run();
  }

  async listPendingByAccount(accountId: string): Promise<Payment[]> {
    const result = await this.db
      .prepare(
        `SELECT ${COLUMNS} FROM payments
        WHERE account_id = ? AND status = 'pending'
        ORDER BY created_at ASC`,
      )
      .bind(accountId)
      .all();

    return result.results.map((row) => this.mapRow(row as PaymentRow));
  }

  async listPendingWithProviderOrder(limit: number): Promise<Payment[]> {
    const result = await this.db
      .prepare(
        `SELECT ${COLUMNS} FROM payments
        WHERE status = 'pending' AND provider_order_id IS NOT NULL
        ORDER BY created_at ASC
        LIMIT ?`,
      )
      .bind(limit)
      .all();

    return result.results.map((row) => this.mapRow(row as PaymentRow));
  }

  async listBySubscription(subscriptionId: string): Promise<Payment[]> {
    const result = await this.db
      .prepare(
        `SELECT ${COLUMNS} FROM payments
        WHERE subscription_id = ?
        ORDER BY created_at DESC`,
      )
      .bind(subscriptionId)
      .all();

    return result.results.map((row) => this.mapRow(row as PaymentRow));
  }

  async getLatestCompletedByAccount(accountId: string): Promise<Payment | null> {
    const row = await this.db
      .prepare(
        `SELECT ${COLUMNS} FROM payments
        WHERE account_id = ? AND status = 'completed'
        ORDER BY COALESCE(paid_at, created_at) DESC
        LIMIT 1`,
      )
      .bind(accountId)
      .first();

    return row === null || row === undefined ? null : this.mapRow(row as PaymentRow);
  }

  private async firstBy(
    column: "id" | "idempotency_key" | "provider_order_id",
    value: string,
  ): Promise<Payment | null> {
    const row = await this.db
      .prepare(`SELECT ${COLUMNS} FROM payments WHERE ${column} = ?`)
      .bind(value)
      .first();

    return row === null || row === undefined ? null : this.mapRow(row as PaymentRow);
  }

  private mapRow(row: PaymentRow): Payment {
    return {
      id: row.id,
      accountId: row.account_id,
      subscriptionId: row.subscription_id,
      planId: row.plan_id === null ? null : parsePlanId(row.plan_id),
      billingInterval: parseBillingInterval(row.billing_interval),
      method: parsePaymentMethod(row.method),
      provider: parsePaymentProvider(row.provider),
      providerOrderId: row.provider_order_id,
      providerChargeId: row.provider_charge_id,
      idempotencyKey: row.idempotency_key,
      amount: row.amount,
      currency: row.currency,
      status: parsePaymentStatus(row.status),
      reference: row.reference,
      nextActionUrl: row.next_action_url,
      expiresAt: fromEpoch(row.expires_at),
      failureReason: row.failure_reason,
      periodStart: fromEpoch(row.period_start),
      periodEnd: fromEpoch(row.period_end),
      paidAt: fromEpoch(row.paid_at),
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
    };
  }
}
