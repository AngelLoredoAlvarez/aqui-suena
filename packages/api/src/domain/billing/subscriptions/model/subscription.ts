import type { BillingInterval } from "@aqui-suena/api/domain/billing/billing-interval";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";

export const SUBSCRIPTION_STATUSES = ["active", "cancelled", "expired", "grace"] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Parses a persisted status; an unknown value is a data-integrity failure. */
export function parseSubscriptionStatus(value: unknown): SubscriptionStatus {
  if (typeof value === "string" && (SUBSCRIPTION_STATUSES as readonly string[]).includes(value)) {
    return value as SubscriptionStatus;
  }

  throw new DataIntegrityError("status", value);
}

export type Subscription = {
  id: string;
  accountId: string;
  planId: PlanId;
  billingInterval: BillingInterval;
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
  create(
    accountId: string,
    planId: PlanId,
    startedAt: Date,
    endsAt: Date,
    billingInterval?: BillingInterval,
  ): Promise<Subscription>;
  updateStatus(id: string, status: SubscriptionStatus): Promise<void>;
  updateEndsAt(id: string, endsAt: Date): Promise<void>;
  renew(id: string, endsAt: Date, billingInterval: BillingInterval): Promise<void>;
  enterGrace(id: string, graceEnd: Date): Promise<void>;
  listByAccount(accountId: string): Promise<Subscription[]>;
  listActiveEndingBefore(deadline: Date, limit: number): Promise<Subscription[]>;
  /** Active subscriptions with a reminder due now, oldest first. */
  listReminderCandidates(now: Date, limit: number): Promise<Subscription[]>;
  listGraceExpired(now: Date, limit: number): Promise<Subscription[]>;
}
