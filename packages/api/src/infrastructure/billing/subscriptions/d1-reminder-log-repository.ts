import type {
  ReminderLogRepository,
  ReminderType,
} from "@aqui-suena/api/domain/billing/subscriptions/model/reminders";
import { fromEpoch, toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";

type ReminderRow = {
  readonly type: unknown;
  readonly sent_at: number;
};

function parseReminderType(value: unknown): ReminderType {
  if (value === "renewal_7d" || value === "renewal_1d") {
    return value;
  }

  throw new DataIntegrityError("type", value);
}

export class D1ReminderLogRepository implements ReminderLogRepository {
  constructor(private readonly db: D1Database) {}

  async hasSent(subscriptionId: string, type: ReminderType, periodEndsAt: Date): Promise<boolean> {
    const row = await this.db
      .prepare(
        `SELECT 1 AS sent FROM subscription_reminders
        WHERE subscription_id = ? AND type = ? AND period_ends_at = ?
        LIMIT 1`,
      )
      .bind(subscriptionId, type, toEpoch(periodEndsAt))
      .first();

    return row !== null;
  }

  async record(
    subscriptionId: string,
    type: ReminderType,
    periodEndsAt: Date,
    sentAt: Date,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO subscription_reminders (id, subscription_id, type, period_ends_at, sent_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(subscription_id, type, period_ends_at) DO NOTHING`,
      )
      .bind(crypto.randomUUID(), subscriptionId, type, toEpoch(periodEndsAt), toEpoch(sentAt))
      .run();
  }

  async sentTypes(subscriptionId: string, periodEndsAt: Date): Promise<Set<ReminderType>> {
    const result = await this.db
      .prepare(
        `SELECT type FROM subscription_reminders
        WHERE subscription_id = ? AND period_ends_at = ?`,
      )
      .bind(subscriptionId, toEpoch(periodEndsAt))
      .all();
    const types = new Set<ReminderType>();

    for (const row of result.results) {
      types.add(parseReminderType((row as ReminderRow).type));
    }

    return types;
  }

  async sentAt(
    subscriptionId: string,
    type: ReminderType,
    periodEndsAt: Date,
  ): Promise<Date | undefined> {
    const row = await this.db
      .prepare(
        `SELECT sent_at FROM subscription_reminders
        WHERE subscription_id = ? AND type = ? AND period_ends_at = ?
        LIMIT 1`,
      )
      .bind(subscriptionId, type, toEpoch(periodEndsAt))
      .first();

    if (row === null) {
      return undefined;
    }

    return fromEpoch((row as ReminderRow).sent_at) ?? undefined;
  }
}
