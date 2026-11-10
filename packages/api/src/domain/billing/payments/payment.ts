export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

import type { PlanId } from "@aqui-suena/api/domain/billing/catalog/entitlements";

export type Payment = {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Invoice = {
  id: string;
  paymentId: string;
  accountId: string;
  planId: PlanId;
  amount: number;
  currency: string;
  issuedAt: Date;
  createdAt: Date;
};

export interface PaymentRepository {
  create(subscriptionId: string, amount: number, currency: string): Promise<Payment>;
  updateStatus(id: string, status: PaymentStatus, paidAt?: Date): Promise<void>;
  listBySubscription(subscriptionId: string): Promise<Payment[]>;
  getById(id: string): Promise<Payment | null>;
}

export class InMemoryPaymentRepository implements PaymentRepository {
  constructor(private readonly store: Payment[] = []) {}

  async create(subscriptionId: string, amount: number, currency: string): Promise<Payment> {
    const payment: Payment = {
      id: crypto.randomUUID(),
      subscriptionId,
      amount,
      currency,
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

export interface InvoiceRepository {
  create(
    paymentId: string,
    accountId: string,
    planId: PlanId,
    amount: number,
    currency: string,
  ): Promise<Invoice>;
  getById(id: string): Promise<Invoice | null>;
  getByPayment(paymentId: string): Promise<Invoice | null>;
  listByAccount(accountId: string): Promise<Invoice[]>;
}

export class InMemoryInvoiceRepository implements InvoiceRepository {
  constructor(private readonly store: Invoice[] = []) {}

  async create(
    paymentId: string,
    accountId: string,
    planId: PlanId,
    amount: number,
    currency: string,
  ): Promise<Invoice> {
    const invoice: Invoice = {
      id: crypto.randomUUID(),
      paymentId,
      accountId,
      planId,
      amount,
      currency,
      issuedAt: new Date(),
      createdAt: new Date(),
    };

    this.store.push(invoice);

    return invoice;
  }

  async getById(id: string): Promise<Invoice | null> {
    return this.store.find((invoice) => invoice.id === id) ?? null;
  }

  async getByPayment(paymentId: string): Promise<Invoice | null> {
    return this.store.find((invoice) => invoice.paymentId === paymentId) ?? null;
  }

  async listByAccount(accountId: string): Promise<Invoice[]> {
    return this.store.filter((invoice) => invoice.accountId === accountId);
  }
}
