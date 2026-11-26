import type {
  NewPayment,
  OpenPaymentIntentQuery,
  Payment,
  PaymentProviderDetails,
  PaymentRepository,
} from "@aqui-suena/api/domain/billing/payments/model/payment";

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

  async releaseCompletion(id: string): Promise<void> {
    const payment = this.store.find((candidate) => candidate.id === id);

    if (
      payment === undefined ||
      payment.status !== "completed" ||
      payment.subscriptionId !== null
    ) {
      return;
    }

    payment.status = "pending";
    payment.paidAt = null;
    payment.updatedAt = new Date();
  }

  async listPendingWithProviderOrder(limit: number): Promise<Payment[]> {
    return this.store
      .filter((payment) => payment.status === "pending" && payment.providerOrderId !== null)
      .slice(0, limit);
  }

  async listPendingByAccount(accountId: string): Promise<Payment[]> {
    return this.store.filter(
      (payment) => payment.accountId === accountId && payment.status === "pending",
    );
  }

  async listBySubscription(subscriptionId: string): Promise<Payment[]> {
    return this.store.filter((payment) => payment.subscriptionId === subscriptionId);
  }

  async getLatestCompletedByAccount(accountId: string): Promise<Payment | null> {
    return (
      this.store
        .filter((payment) => payment.accountId === accountId && payment.status === "completed")
        .sort(
          (left, right) =>
            (right.paidAt?.getTime() ?? right.createdAt.getTime()) -
            (left.paidAt?.getTime() ?? left.createdAt.getTime()),
        )[0] ?? null
    );
  }
}
