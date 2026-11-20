import type { BillingInterval } from "@aqui-suena/api/domain/billing/billing-interval";
import { parseBillingInterval } from "@aqui-suena/api/domain/billing/billing-interval";
import type {
  Subscription,
  SubscriptionRepository,
  SubscriptionStatus,
} from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { parseSubscriptionStatus } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { parsePlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { fromEpoch, toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";

type SubscriptionRow = {
  id: string;
  account_id: string;
  plan_id: string;
  billing_interval: string;
  status: string;
  started_at: number;
  ends_at: number | null;
  grace_end: number | null;
  created_at: number;
  updated_at: number;
};

export class D1SubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly db: D1Database) {}

  async listByAccount(accountId: string): Promise<Subscription[]> {
    const result = await this.db
      .prepare(
        `SELECT id, account_id, plan_id, billing_interval, status, started_at, ends_at, grace_end, created_at, updated_at
        FROM subscriptions
        WHERE account_id = ?
        ORDER BY started_at DESC`,
      )
      .bind(accountId)
      .all();

    return result.results.map((row) => this.mapRow(row as SubscriptionRow));
  }

  async getActive(accountId: string, now: Date = new Date()): Promise<Subscription | null> {
    const row = await this.db
      .prepare(
        `SELECT id, account_id, plan_id, billing_interval, status, started_at, ends_at, grace_end, created_at, updated_at
        FROM subscriptions
        WHERE account_id = ? AND ((status = 'active' AND started_at <= ? AND (ends_at IS NULL OR ends_at > ?)) OR (status = 'grace' AND grace_end IS NOT NULL AND grace_end >= ?) OR (status = 'cancelled' AND ends_at > ?))
        ORDER BY CASE WHEN status = 'active' THEN 0 WHEN status = 'grace' THEN 1 ELSE 2 END
        LIMIT 1`,
      )
      .bind(accountId, toEpoch(now), toEpoch(now), toEpoch(now), toEpoch(now))
      .first();

    return row ? this.mapRow(row as SubscriptionRow) : null;
  }

  async getById(id: string): Promise<Subscription | null> {
    const row = await this.db
      .prepare(
        `SELECT id, account_id, plan_id, billing_interval, status, started_at, ends_at, grace_end, created_at, updated_at
        FROM subscriptions
        WHERE id = ?`,
      )
      .bind(id)
      .first();

    return row ? this.mapRow(row as SubscriptionRow) : null;
  }

  async create(
    accountId: string,
    planId: PlanId,
    startedAt: Date,
    endsAt: Date,
    billingInterval: BillingInterval = "monthly",
  ): Promise<Subscription> {
    const id = crypto.randomUUID();

    const now = new Date();

    await this.db
      .prepare(
        `INSERT INTO subscriptions (id, account_id, plan_id, billing_interval, status, started_at, ends_at, grace_end, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'active', ?, ?, NULL, ?, ?)`,
      )
      .bind(
        id,
        accountId,
        planId,
        billingInterval,
        toEpoch(startedAt),
        toEpoch(endsAt),
        toEpoch(now),
        toEpoch(now),
      )
      .run();

    return {
      id,
      accountId,
      planId,
      billingInterval,
      status: "active",
      startedAt,
      endsAt,
      graceEnd: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateStatus(id: string, status: SubscriptionStatus): Promise<void> {
    const now = new Date();

    await this.db
      .prepare("UPDATE subscriptions SET status = ?, updated_at = ? WHERE id = ?")
      .bind(status, toEpoch(now), id)
      .run();
  }

  async updateEndsAt(id: string, endsAt: Date): Promise<void> {
    const now = new Date();

    await this.db
      .prepare("UPDATE subscriptions SET ends_at = ?, updated_at = ? WHERE id = ?")
      .bind(toEpoch(endsAt), toEpoch(now), id)
      .run();
  }

  async renew(id: string, endsAt: Date, billingInterval: BillingInterval): Promise<void> {
    const now = new Date();

    await this.db
      .prepare(
        "UPDATE subscriptions SET status = 'active', ends_at = MAX(COALESCE(ends_at, 0), ?), billing_interval = ?, grace_end = NULL, updated_at = ? WHERE id = ?",
      )
      .bind(toEpoch(endsAt), billingInterval, toEpoch(now), id)
      .run();
  }

  async enterGrace(id: string, graceEnd: Date): Promise<void> {
    const now = new Date();

    await this.db
      .prepare(
        "UPDATE subscriptions SET status = 'grace', grace_end = ?, updated_at = ? WHERE id = ?",
      )
      .bind(toEpoch(graceEnd), toEpoch(now), id)
      .run();
  }

  async listActiveEndingBefore(deadline: Date, limit: number): Promise<Subscription[]> {
    const result = await this.db
      .prepare(
        `SELECT id, account_id, plan_id, billing_interval, status, started_at, ends_at, grace_end, created_at, updated_at
        FROM subscriptions
        WHERE status = 'active' AND ends_at IS NOT NULL AND ends_at <= ?
        ORDER BY ends_at ASC
        LIMIT ?`,
      )
      .bind(toEpoch(deadline), limit)
      .all();

    return result.results.map((row) => this.mapRow(row as SubscriptionRow));
  }

  /** A recorded reminder drops the row until its next window opens. */
  async listReminderCandidates(now: Date, limit: number): Promise<Subscription[]> {
    const oneDay = 86_400;
    const dayStart = Math.floor(toEpoch(now) / oneDay) * oneDay;
    const sevenDayStart = dayStart + 2 * oneDay;
    const windowEnd = dayStart + 8 * oneDay;

    const result = await this.db
      .prepare(
        `SELECT s.id, s.account_id, s.plan_id, s.billing_interval, s.status, s.started_at, s.ends_at, s.grace_end, s.created_at, s.updated_at
        FROM subscriptions s
        JOIN accounts a ON a.id = s.account_id
        LEFT JOIN account_preferences p ON p.account_id = s.account_id
        WHERE s.status = 'active'
          AND a.deleted_at IS NULL
          AND COALESCE(p.renewal_reminders_enabled, 1) = 1
          AND s.ends_at >= ? AND s.ends_at < ?
          AND (
            (s.ends_at >= ? AND NOT EXISTS (
              SELECT 1 FROM subscription_reminders r
              WHERE r.subscription_id = s.id AND r.type = 'renewal_7d'
            ))
            OR (s.ends_at < ? AND NOT EXISTS (
              SELECT 1 FROM subscription_reminders r
              WHERE r.subscription_id = s.id AND r.type = 'renewal_1d'
            ))
          )
        ORDER BY s.ends_at ASC, s.id ASC
        LIMIT ?`,
      )
      .bind(dayStart, windowEnd, sevenDayStart, sevenDayStart, limit)
      .all();

    return result.results.map((row) => this.mapRow(row as SubscriptionRow));
  }

  async listGraceExpired(now: Date, limit: number): Promise<Subscription[]> {
    const result = await this.db
      .prepare(
        `SELECT id, account_id, plan_id, billing_interval, status, started_at, ends_at, grace_end, created_at, updated_at
        FROM subscriptions
        WHERE status = 'grace' AND grace_end IS NOT NULL AND grace_end <= ?
        ORDER BY grace_end ASC
        LIMIT ?`,
      )
      .bind(toEpoch(now), limit)
      .all();

    return result.results.map((row) => this.mapRow(row as SubscriptionRow));
  }

  private mapRow(row: SubscriptionRow): Subscription {
    return {
      id: row.id,
      accountId: row.account_id,
      planId: parsePlanId(row.plan_id),
      billingInterval: parseBillingInterval(row.billing_interval),
      status: parseSubscriptionStatus(row.status),
      startedAt: new Date(row.started_at * 1000),
      endsAt: fromEpoch(row.ends_at),
      graceEnd: fromEpoch(row.grace_end ?? null),
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
    };
  }
}
