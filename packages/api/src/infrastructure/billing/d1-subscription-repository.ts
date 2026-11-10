import type { PlanId } from "@aqui-suena/api/domain/billing/catalog/entitlements";
import type {
  Subscription,
  SubscriptionRepository,
  SubscriptionStatus,
} from "@aqui-suena/api/domain/billing/subscriptions/subscriptions";
import { fromEpoch, toEpoch } from "@aqui-suena/api/infrastructure/shared/d1-epoch";

type SubscriptionRow = {
  id: string;
  account_id: string;
  plan_id: string;
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
        "SELECT id, account_id, plan_id, status, started_at, ends_at, grace_end, created_at, updated_at FROM subscriptions WHERE account_id = ? ORDER BY started_at DESC",
      )
      .bind(accountId)
      .all();

    return result.results.map((row) => this.mapRow(row as SubscriptionRow));
  }

  async getActive(accountId: string, now: Date = new Date()): Promise<Subscription | null> {
    const row = await this.db
      .prepare(
        "SELECT id, account_id, plan_id, status, started_at, ends_at, grace_end, created_at, updated_at FROM subscriptions WHERE account_id = ? AND ((status = 'active' AND started_at <= ? AND (ends_at IS NULL OR ends_at > ?)) OR (status = 'grace' AND grace_end IS NOT NULL AND grace_end >= ?) OR (status = 'cancelled' AND ends_at > ?)) ORDER BY CASE WHEN status = 'active' THEN 0 WHEN status = 'grace' THEN 1 ELSE 2 END LIMIT 1",
      )
      .bind(accountId, toEpoch(now), toEpoch(now), toEpoch(now), toEpoch(now))
      .first();

    return row ? this.mapRow(row as SubscriptionRow) : null;
  }

  async getById(id: string): Promise<Subscription | null> {
    const row = await this.db
      .prepare(
        "SELECT id, account_id, plan_id, status, started_at, ends_at, grace_end, created_at, updated_at FROM subscriptions WHERE id = ?",
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
  ): Promise<Subscription> {
    const id = crypto.randomUUID();

    const now = new Date();

    await this.db
      .prepare(
        "INSERT INTO subscriptions (id, account_id, plan_id, status, started_at, ends_at, grace_end, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?, NULL, ?, ?)",
      )
      .bind(id, accountId, planId, toEpoch(startedAt), toEpoch(endsAt), toEpoch(now), toEpoch(now))
      .run();

    return {
      id,
      accountId,
      planId,
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

  async updateGraceEnd(id: string, graceEnd: Date): Promise<void> {
    const now = new Date();

    await this.db
      .prepare("UPDATE subscriptions SET grace_end = ?, updated_at = ? WHERE id = ?")
      .bind(toEpoch(graceEnd), toEpoch(now), id)
      .run();
  }

  private mapRow(row: SubscriptionRow): Subscription {
    return {
      id: row.id,
      accountId: row.account_id,
      planId: row.plan_id as PlanId,
      status: row.status as SubscriptionStatus,
      startedAt: new Date(row.started_at * 1000),
      endsAt: fromEpoch(row.ends_at),
      graceEnd: fromEpoch(row.grace_end ?? null),
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
    };
  }
}
