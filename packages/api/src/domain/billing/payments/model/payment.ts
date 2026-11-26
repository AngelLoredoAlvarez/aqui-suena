import type { BillingInterval } from "@aqui-suena/api/domain/billing/billing-interval";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";

export {
  BILLING_INTERVALS,
  type BillingInterval,
  parseBillingInterval,
} from "@aqui-suena/api/domain/billing/billing-interval";

export const PAYMENT_STATUSES = ["pending", "completed", "failed", "expired", "refunded"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["card", "cash", "spei"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_PROVIDERS = ["conekta"] as const;

export type PaymentProviderName = (typeof PAYMENT_PROVIDERS)[number];

function parseMember<T extends string>(values: readonly T[], field: string, value: unknown): T {
  if (typeof value === "string" && (values as readonly string[]).includes(value)) {
    return value as T;
  }

  throw new DataIntegrityError(field, value);
}

export function parsePaymentStatus(value: unknown): PaymentStatus {
  return parseMember(PAYMENT_STATUSES, "status", value);
}

export function parsePaymentMethod(value: unknown): PaymentMethod {
  return parseMember(PAYMENT_METHODS, "method", value);
}

export function parsePaymentProvider(value: unknown): PaymentProviderName {
  return parseMember(PAYMENT_PROVIDERS, "provider", value);
}

export type PaymentProviderDetails = {
  readonly providerOrderId: string | null;
  readonly providerChargeId: string | null;
  readonly reference: string | null;
  readonly nextActionUrl: string | null;
  readonly expiresAt: Date | null;
  readonly failureReason: string | null;
};

export type Payment = {
  id: string;
  accountId: string;
  subscriptionId: string | null;
  planId: PlanId | null;
  billingInterval: BillingInterval;
  method: PaymentMethod;
  provider: PaymentProviderName;
  providerOrderId: string | null;
  providerChargeId: string | null;
  idempotencyKey: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  reference: string | null;
  nextActionUrl: string | null;
  expiresAt: Date | null;
  failureReason: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NewPayment = {
  readonly accountId: string;
  readonly planId: PlanId;
  readonly billingInterval: BillingInterval;
  readonly method: PaymentMethod;
  readonly idempotencyKey: string;
  readonly amount: number;
  readonly currency: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
};

export type OpenPaymentIntentQuery = {
  readonly accountId: string;
  readonly planId: PlanId;
  readonly billingInterval: BillingInterval;
  readonly method: PaymentMethod;
};

export interface PaymentRepository {
  create(input: NewPayment): Promise<Payment>;
  getById(id: string): Promise<Payment | null>;
  getByIdempotencyKey(key: string): Promise<Payment | null>;
  getByProviderOrderId(providerOrderId: string): Promise<Payment | null>;
  findOpenIntent(query: OpenPaymentIntentQuery): Promise<Payment | null>;
  applyProviderResult(id: string, details: PaymentProviderDetails): Promise<void>;
  claimCompletion(id: string, paidAt: Date): Promise<boolean>;
  markFailed(id: string, reason: string, at: Date): Promise<boolean>;
  markExpired(id: string, at: Date): Promise<boolean>;
  attachSubscription(id: string, subscriptionId: string): Promise<void>;
  releaseCompletion(id: string): Promise<void>;
  listPendingWithProviderOrder(limit: number): Promise<Payment[]>;
  listPendingByAccount(accountId: string): Promise<Payment[]>;
  listBySubscription(subscriptionId: string): Promise<Payment[]>;
  getLatestCompletedByAccount(accountId: string): Promise<Payment | null>;
}
