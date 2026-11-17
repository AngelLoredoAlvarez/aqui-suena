import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";

export const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Parses a persisted status; an unknown value is a data-integrity failure. */
export function parsePaymentStatus(value: unknown): PaymentStatus {
  if (typeof value === "string" && (PAYMENT_STATUSES as readonly string[]).includes(value)) {
    return value as PaymentStatus;
  }

  throw new DataIntegrityError("status", value);
}

export type Payment = {
  id: string;
  subscriptionId: string;
  planId: PlanId | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NewPayment = {
  readonly subscriptionId: string;
  readonly planId: PlanId;
  readonly amount: number;
  readonly currency: string;
};

export interface PaymentRepository {
  create(input: NewPayment): Promise<Payment>;
  updateStatus(id: string, status: PaymentStatus, paidAt?: Date): Promise<void>;
  listBySubscription(subscriptionId: string): Promise<Payment[]>;
  getById(id: string): Promise<Payment | null>;
}

export class InMemoryPaymentRepository implements PaymentRepository {
  constructor(private readonly store: Payment[] = []) {}

  async create(input: NewPayment): Promise<Payment> {
    const payment: Payment = {
      id: crypto.randomUUID(),
      subscriptionId: input.subscriptionId,
      planId: input.planId,
      amount: input.amount,
      currency: input.currency,
      status: "pending",
      paidAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.store.push(payment);

    return payment;
  }

  async updateStatus(id: string, status: PaymentStatus, paidAt?: Date): Promise<void> {
    const payment = this.store.find((p) => p.id === id);

    if (payment) {
      payment.status = status;

      if (paidAt) payment.paidAt = paidAt;

      payment.updatedAt = new Date();
    }
  }

  async listBySubscription(subscriptionId: string): Promise<Payment[]> {
    return this.store.filter((p) => p.subscriptionId === subscriptionId);
  }

  async getById(id: string): Promise<Payment | null> {
    return this.store.find((p) => p.id === id) ?? null;
  }
}
