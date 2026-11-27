import type {
  ReminderLogRepository,
  ReminderType,
} from "@aqui-suena/api/domain/billing/subscriptions/model/reminders";

export class InMemoryReminderLogRepository implements ReminderLogRepository {
  private readonly store = new Map<string, Set<ReminderType>>();
  private readonly timestamps = new Map<string, Date>();

  async hasSent(subscriptionId: string, type: ReminderType, periodEndsAt: Date): Promise<boolean> {
    const types = this.store.get(periodKey(subscriptionId, periodEndsAt));

    if (types === undefined) {
      return false;
    }

    return types.has(type);
  }

  async record(
    subscriptionId: string,
    type: ReminderType,
    periodEndsAt: Date,
    sentAt: Date,
  ): Promise<void> {
    const key = periodKey(subscriptionId, periodEndsAt);
    let types = this.store.get(key);

    if (types === undefined) {
      types = new Set();

      this.store.set(key, types);
    }

    if (types.has(type)) return;

    types.add(type);
    this.timestamps.set(`${key}:${type}`, sentAt);
  }

  async sentTypes(subscriptionId: string, periodEndsAt: Date): Promise<Set<ReminderType>> {
    return this.store.get(periodKey(subscriptionId, periodEndsAt)) ?? new Set();
  }

  async sentAt(
    subscriptionId: string,
    type: ReminderType,
    periodEndsAt: Date,
  ): Promise<Date | undefined> {
    return this.timestamps.get(`${periodKey(subscriptionId, periodEndsAt)}:${type}`);
  }
}

function periodKey(subscriptionId: string, periodEndsAt: Date): string {
  return `${subscriptionId}:${periodEndsAt.toISOString()}`;
}
