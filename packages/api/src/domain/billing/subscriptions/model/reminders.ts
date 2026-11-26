import type { Subscription } from "@aqui-suena/api/domain/billing/subscriptions/model/subscription";

export type ReminderType = "renewal_7d" | "renewal_1d";

export interface ReminderPreferences {
  renewalRemindersEnabled: boolean;
}

export interface ReminderLogRepository {
  hasSent(subscriptionId: string, type: ReminderType, periodEndsAt: Date): Promise<boolean>;
  record(
    subscriptionId: string,
    type: ReminderType,
    periodEndsAt: Date,
    sentAt: Date,
  ): Promise<void>;
  sentTypes(subscriptionId: string, periodEndsAt: Date): Promise<Set<ReminderType>>;
  sentAt(subscriptionId: string, type: ReminderType, periodEndsAt: Date): Promise<Date | undefined>;
}

/**
 * Count calendar days between two instants using UTC midnights.
 *
 * A DST transition makes a "day" 23 or 25 hours long, so elapsed milliseconds
 * are not a reliable day count. Normalizing both dates to `Date.UTC(y, m, d)`
 * keeps the result independent of the process time zone and DST.
 */
export function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const fromDay = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const toDay = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());

  return Math.round((toDay - fromDay) / msPerDay);
}

export function dueReminders(
  subscription: Subscription,
  now: Date,
  sent: Set<ReminderType>,
  preferences: ReminderPreferences,
): ReminderType[] {
  if (subscription.status !== "active" || subscription.endsAt === null) {
    return [];
  }

  const daysUntilExpiry = daysBetween(now, subscription.endsAt);

  if (daysUntilExpiry < 0) {
    return [];
  }

  const due: ReminderType[] = [];

  if (preferences.renewalRemindersEnabled) {
    if (daysUntilExpiry >= 2 && daysUntilExpiry <= 7 && !sent.has("renewal_7d")) {
      due.push("renewal_7d");
    }

    if (daysUntilExpiry >= 0 && daysUntilExpiry <= 1 && !sent.has("renewal_1d")) {
      due.push("renewal_1d");
    }
  }

  return due;
}
