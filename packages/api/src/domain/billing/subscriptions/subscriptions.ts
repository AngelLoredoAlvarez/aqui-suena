import { isInGracePeriod } from "@aqui-suena/api/domain/billing/subscriptions/downgrade";
import type { PlanId } from "@aqui-suena/api/entitlements";
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "grace";

export type Subscription = {
  id: string;
  accountId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  startedAt: Date;
  endsAt: Date | null;
  graceEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface SubscriptionRepository {
  getActive(accountId: string, now?: Date): Promise<Subscription | null>;
  getById(id: string): Promise<Subscription | null>;
  create(accountId: string, planId: PlanId, startedAt: Date, endsAt: Date): Promise<Subscription>;
  updateStatus(id: string, status: SubscriptionStatus): Promise<void>;
  updateEndsAt(id: string, endsAt: Date): Promise<void>;
  updateGraceEnd(id: string, graceEnd: Date): Promise<void>;
  listByAccount(accountId: string): Promise<Subscription[]>;
}

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
  ): Promise<Subscription> {
    const subscription: Subscription = {
      id: crypto.randomUUID(),
      accountId,
      planId,
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

  async updateGraceEnd(id: string, graceEnd: Date): Promise<void> {
    const sub = this.store.find((s) => s.id === id);

    if (sub) {
      sub.graceEnd = graceEnd;
      sub.updatedAt = new Date();
    }
  }
}
