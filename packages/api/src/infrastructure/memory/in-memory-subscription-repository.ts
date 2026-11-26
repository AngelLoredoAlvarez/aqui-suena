import type { BillingInterval } from "@aqui-suena/api/domain/billing/billing-interval";
import { isInGracePeriod } from "@aqui-suena/api/domain/billing/subscriptions/model/grace";
import type {
  Subscription,
  SubscriptionRepository,
  SubscriptionStatus,
} from "@aqui-suena/api/domain/billing/subscriptions/model/subscription";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";

export class InMemorySubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly store: Subscription[] = []) {}

  async listByAccount(accountId: string): Promise<Subscription[]> {
    return this.store.filter((s) => s.accountId === accountId);
  }

  async getActive(accountId: string, now: Date = new Date()): Promise<Subscription | null> {
    const subs = this.store.filter((s) => s.accountId === accountId);

    const active = subs.find(
      (s) => s.status === "active" && s.startedAt <= now && (s.endsAt === null || s.endsAt > now),
    );

    if (active) return active;

    const grace = subs.find(
      (s) => s.status === "grace" && s.graceEnd !== null && isInGracePeriod(s.graceEnd, now),
    );

    if (grace) return grace;

    const cancelled = subs.find(
      (s) => s.status === "cancelled" && s.endsAt !== null && s.endsAt > now,
    );

    return cancelled ?? null;
  }

  async getById(id: string): Promise<Subscription | null> {
    return this.store.find((s) => s.id === id) ?? null;
  }

  async create(
    accountId: string,
    planId: PlanId,
    startedAt: Date,
    endsAt: Date,
    billingInterval: BillingInterval = "monthly",
  ): Promise<Subscription> {
    const subscription: Subscription = {
      id: crypto.randomUUID(),
      accountId,
      planId,
      billingInterval,
      status: "active",
      startedAt,
      endsAt,
      graceEnd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.store.push(subscription);

    return subscription;
  }

  async updateStatus(id: string, status: SubscriptionStatus): Promise<void> {
    const sub = this.store.find((s) => s.id === id);

    if (sub) {
      sub.status = status;
      sub.updatedAt = new Date();
    }
  }

  async updateEndsAt(id: string, endsAt: Date): Promise<void> {
    const sub = this.store.find((s) => s.id === id);

    if (sub) {
      sub.endsAt = endsAt;
      sub.updatedAt = new Date();
    }
  }

  async renew(id: string, endsAt: Date, billingInterval: BillingInterval): Promise<void> {
    const sub = this.store.find((s) => s.id === id);

    if (sub) {
      sub.status = "active";
      sub.endsAt = sub.endsAt !== null && sub.endsAt > endsAt ? sub.endsAt : endsAt;
      sub.billingInterval = billingInterval;
      sub.graceEnd = null;
      sub.updatedAt = new Date();
    }
  }

  async enterGrace(id: string, graceEnd: Date): Promise<void> {
    const sub = this.store.find((s) => s.id === id);

    if (sub) {
      sub.status = "grace";
      sub.graceEnd = graceEnd;
      sub.updatedAt = new Date();
    }
  }

  async listActiveEndingBefore(deadline: Date, limit: number): Promise<Subscription[]> {
    return this.store
      .filter((sub) => sub.status === "active" && sub.endsAt !== null && sub.endsAt <= deadline)
      .sort((left, right) => (left.endsAt?.getTime() ?? 0) - (right.endsAt?.getTime() ?? 0))
      .slice(0, limit);
  }

  async listReminderCandidates(now: Date, limit: number): Promise<Subscription[]> {
    const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const windowEnd = dayStart + 8 * 24 * 60 * 60 * 1000;

    return this.store
      .filter(
        (sub) =>
          sub.status === "active" &&
          sub.endsAt !== null &&
          sub.endsAt.getTime() >= dayStart &&
          sub.endsAt.getTime() < windowEnd,
      )
      .sort((left, right) => (left.endsAt?.getTime() ?? 0) - (right.endsAt?.getTime() ?? 0))
      .slice(0, limit);
  }

  async listGraceExpired(now: Date, limit: number): Promise<Subscription[]> {
    return this.store
      .filter((sub) => sub.status === "grace" && sub.graceEnd !== null && sub.graceEnd <= now)
      .sort((left, right) => (left.graceEnd?.getTime() ?? 0) - (right.graceEnd?.getTime() ?? 0))
      .slice(0, limit);
  }
}
