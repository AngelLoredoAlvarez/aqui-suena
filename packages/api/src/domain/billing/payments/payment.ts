import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";

export const PAYMENT_STATUSES = ["pending", "completed", "failed", "expired", "refunded"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["card", "oxxo", "spei"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const BILLING_INTERVALS = ["monthly", "annual"] as const;

export type BillingInterval = (typeof BILLING_INTERVALS)[number];

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

export function parseBillingInterval(value: unknown): BillingInterval {
  return parseMember(BILLING_INTERVALS, "billingInterval", value);
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
  listPendingWithProviderOrder(limit: number): Promise<Payment[]>;
  listBySubscription(subscriptionId: string): Promise<Payment[]>;
}

export class InMemoryPaymentRepository implements PaymentRepository {
  constructor(private readonly store: Payment[] = []) {}

  async create(input: NewPayment): Promise<Payment> {
    const now = new Date();

    const payment: Payment = {
      id: crypto.randomUUID(),
      accountId: input.accountId,
      subscriptionId: null,
      planId: input.planId,
      billingInterval: input.billingInterval,
      method: input.method,
      provider: "conekta",
      providerOrderId: null,
      providerChargeId: null,
      idempotencyKey: input.idempotencyKey,
      amount: input.amount,
      currency: input.currency,
      status: "pending",
      reference: null,
      nextActionUrl: null,
      expiresAt: null,
      failureReason: null,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.store.push(payment);

    return payment;
  }

  async getById(id: string): Promise<Payment | null> {
    return this.store.find((payment) => payment.id === id) ?? null;
  }

  async getByIdempotencyKey(key: string): Promise<Payment | null> {
    return this.store.find((payment) => payment.idempotencyKey === key) ?? null;
  }

  async getByProviderOrderId(providerOrderId: string): Promise<Payment | null> {
    return this.store.find((payment) => payment.providerOrderId === providerOrderId) ?? null;
  }

  async findOpenIntent(query: OpenPaymentIntentQuery): Promise<Payment | null> {
    const matches = this.store.filter(
      (payment) =>
        payment.status === "pending" &&
        payment.accountId === query.accountId &&
        payment.planId === query.planId &&
        payment.billingInterval === query.billingInterval &&
        payment.method === query.method,
    );

    return matches.at(-1) ?? null;
  }

  async applyProviderResult(id: string, details: PaymentProviderDetails): Promise<void> {
    const payment = this.store.find((candidate) => candidate.id === id);

    if (payment === undefined) return;

    payment.providerOrderId = details.providerOrderId;
    payment.providerChargeId = details.providerChargeId;
    payment.reference = details.reference;
    payment.nextActionUrl = details.nextActionUrl;
    payment.expiresAt = details.expiresAt;
    payment.failureReason = details.failureReason;
    payment.updatedAt = new Date();
  }

  async claimCompletion(id: string, paidAt: Date): Promise<boolean> {
    const payment = this.store.find((candidate) => candidate.id === id);

    if (payment === undefined || payment.status !== "pending") return false;

    payment.status = "completed";
    payment.paidAt = paidAt;
    payment.updatedAt = new Date();

    return true;
  }

  async markFailed(id: string, reason: string, at: Date): Promise<boolean> {
    const payment = this.store.find((candidate) => candidate.id === id);

    if (payment === undefined || payment.status !== "pending") return false;

    payment.status = "failed";
    payment.failureReason = reason;
    payment.updatedAt = at;

    return true;
  }

  async markExpired(id: string, at: Date): Promise<boolean> {
    const payment = this.store.find((candidate) => candidate.id === id);

    if (payment === undefined || payment.status !== "pending") return false;

    payment.status = "expired";
    payment.updatedAt = at;

    return true;
  }

  async attachSubscription(id: string, subscriptionId: string): Promise<void> {
    const payment = this.store.find((candidate) => candidate.id === id);

    if (payment === undefined || payment.subscriptionId !== null) return;

    payment.subscriptionId = subscriptionId;
    payment.updatedAt = new Date();
  }

  async listPendingWithProviderOrder(limit: number): Promise<Payment[]> {
    return this.store
      .filter((payment) => payment.status === "pending" && payment.providerOrderId !== null)
      .slice(0, limit);
  }

  async listBySubscription(subscriptionId: string): Promise<Payment[]> {
    return this.store.filter((payment) => payment.subscriptionId === subscriptionId);
  }
}
