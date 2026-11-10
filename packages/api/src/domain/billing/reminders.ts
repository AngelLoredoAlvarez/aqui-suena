import type { Subscription } from "@aqui-suena/api/domain/billing/subscriptions";

export type ReminderType = "renewal_7d" | "renewal_1d";

export interface ReminderPreferences {
  renewalRemindersEnabled: boolean;
}

export interface ReminderLogRepository {
  hasSent(subscriptionId: string, type: ReminderType): Promise<boolean>;
  record(subscriptionId: string, type: ReminderType, sentAt: Date): Promise<void>;
  sentTypes(subscriptionId: string): Promise<Set<ReminderType>>;
  sentAt(subscriptionId: string, type: ReminderType): Promise<Date | undefined>;
}

export class InMemoryReminderLogRepository implements ReminderLogRepository {
  private readonly store = new Map<string, Set<ReminderType>>();
  private readonly timestamps = new Map<string, Date>();

  async hasSent(subscriptionId: string, type: ReminderType): Promise<boolean> {
    const types = this.store.get(subscriptionId);

    if (types === undefined) {
      return false;
    }

    return types.has(type);
  }

  async record(subscriptionId: string, type: ReminderType, sentAt: Date): Promise<void> {
    let types = this.store.get(subscriptionId);

    if (types === undefined) {
      types = new Set();

      this.store.set(subscriptionId, types);
    }

    types.add(type);
    this.timestamps.set(`${subscriptionId}:${type}`, sentAt);
  }

  async sentTypes(subscriptionId: string): Promise<Set<ReminderType>> {
    const types = this.store.get(subscriptionId);

    if (types === undefined) {
      return new Set();
    }

    return types;
  }

  async sentAt(subscriptionId: string, type: ReminderType): Promise<Date | undefined> {
    return this.timestamps.get(`${subscriptionId}:${type}`);
  }
}

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;

  return Math.floor((to.getTime() - from.getTime()) / msPerDay);
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
