import type {
  BillingInterval,
  Payment,
  PaymentMethod,
  PaymentRepository,
} from "@aqui-suena/api/domain/billing/payments/payment";
import type {
  ChargeResult,
  PaymentCardWriter,
  PaymentCustomer,
  PaymentProvider,
} from "@aqui-suena/api/domain/billing/payments/payment-provider";
import type { PaymentSubscriptionWriter } from "@aqui-suena/api/domain/billing/payments/payment-subscription-writer";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import {
  ConflictError,
  DataIntegrityError,
  NotFoundError,
  ValidationError,
} from "@aqui-suena/api/shared/domain-error";

export type PaymentServiceDependencies = {
  readonly payments: PaymentRepository;
  readonly plans: PlanRepository;
  readonly provider: PaymentProvider;
  readonly subscriptions: PaymentSubscriptionWriter;
  readonly cards?: PaymentCardWriter;
  readonly now?: () => Date;
};

export type CreatePaymentInput = {
  readonly accountId: string;
  readonly planId: PlanId;
  readonly billingInterval: BillingInterval;
  readonly method: PaymentMethod;
  readonly idempotencyKey: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly customer: PaymentCustomer;
  readonly cardToken?: string;
  readonly savedCard?: {
    readonly customerId: string;
    readonly sourceId: string;
  };
  readonly expiresAt?: Date;
  readonly returnUrl?: string;
};

export class PaymentService {
  private readonly deps: PaymentServiceDependencies;

  constructor(deps: PaymentServiceDependencies) {
    this.deps = deps;
  }

  async create(input: CreatePaymentInput): Promise<Payment> {
    const now = this.currentDate();

    if (input.idempotencyKey.trim().length === 0) {
      throw new ValidationError("idempotencyKey is required");
    }

    const existing = await this.deps.payments.getByIdempotencyKey(input.idempotencyKey);

    if (existing !== null) {
      if (
        existing.accountId !== input.accountId ||
        existing.planId !== input.planId ||
        existing.billingInterval !== input.billingInterval ||
        existing.method !== input.method
      ) {
        throw new ConflictError("Idempotency key already used");
      }

      return existing;
    }

    if (input.periodEnd <= input.periodStart) {
      throw new ValidationError("periodEnd must be after periodStart");
    }

    const plan = await this.deps.plans.getById(input.planId);

    if (plan === null) {
      throw new NotFoundError("Plan not found");
    }

    if (!plan.active || plan.priceMonthly <= 0) {
      throw new ValidationError("Plan is not billable");
    }

    if (input.method === "card" && input.cardToken === undefined && input.savedCard === undefined) {
      throw new ValidationError("cardToken is required for card payments");
    }

    const amount = input.billingInterval === "annual" ? plan.priceAnnual : plan.priceMonthly;

    if (amount <= 0) {
      throw new ValidationError("Plan has no price for this interval");
    }

    const open = await this.deps.payments.findOpenIntent({
      accountId: input.accountId,
      planId: input.planId,
      billingInterval: input.billingInterval,
      method: input.method,
    });

    if (open !== null) {
      if (open.expiresAt === null || open.expiresAt > now) {
        return open;
      }

      await this.deps.payments.markExpired(open.id, now);
    }

    let savedCard = input.savedCard;
    let cardToken = input.cardToken;

    if (input.method === "card" && input.cardToken !== undefined && this.deps.cards !== undefined) {
      const source = await this.deps.provider.createCardSource({
        customer: input.customer,
        token: input.cardToken,
        idempotencyKey: `${input.idempotencyKey}:card`,
      });

      await this.deps.cards.save(input.accountId, source);

      savedCard = { customerId: source.customerId, sourceId: source.sourceId };
      cardToken = undefined;
    }

    const payment = await this.deps.payments.create({
      accountId: input.accountId,
      planId: input.planId,
      billingInterval: input.billingInterval,
      method: input.method,
      idempotencyKey: input.idempotencyKey,
      amount,
      currency: plan.currency,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    });

    let charge: ChargeResult;

    try {
      charge = await this.deps.provider.createCharge({
        paymentId: payment.id,
        accountId: input.accountId,
        amount,
        currency: plan.currency,
        method: input.method,
        billingInterval: input.billingInterval,
        description: plan.name,
        customer: input.customer,
        cardToken,
        savedCard,
        expiresAt: input.expiresAt,
        returnUrl: input.returnUrl,
        idempotencyKey: input.idempotencyKey,
      });
    } catch (error) {
      await this.deps.payments.markFailed(payment.id, "provider_error", now);
      throw error;
    }

    await this.deps.payments.applyProviderResult(payment.id, {
      providerOrderId: charge.providerOrderId,
      providerChargeId: charge.providerChargeId,
      reference: charge.reference,
      nextActionUrl: charge.nextActionUrl,
      expiresAt: charge.expiresAt,
      failureReason: charge.failureReason,
    });

    if (charge.status === "paid") {
      return this.complete(payment.id, now);
    }

    if (charge.status === "declined") {
      await this.deps.payments.markFailed(payment.id, charge.failureReason ?? "declined", now);
    } else if (charge.status === "expired") {
      await this.deps.payments.markExpired(payment.id, now);
    }

    return this.requirePayment(payment.id);
  }

  async complete(paymentId: string, paidAt: Date = this.currentDate()): Promise<Payment> {
    const payment = await this.requirePayment(paymentId);

    if (payment.status === "completed") {
      return payment;
    }

    if (payment.status !== "pending") {
      throw new ConflictError(
        `Only a pending payment can be completed (current status: ${payment.status})`,
      );
    }

    if (payment.planId === null) {
      throw new DataIntegrityError("planId", payment.planId);
    }

    if (payment.periodStart === null || payment.periodEnd === null) {
      throw new DataIntegrityError("period", payment.periodStart);
    }

    const subscriptionId = await this.deps.subscriptions.activate({
      paymentId: payment.id,
      accountId: payment.accountId,
      planId: payment.planId,
      billingInterval: payment.billingInterval,
      periodStart: payment.periodStart,
      periodEnd: payment.periodEnd,
    });

    const claimed = await this.deps.payments.claimCompletion(payment.id, paidAt);

    if (!claimed) {
      return this.requirePayment(payment.id);
    }

    await this.deps.payments.attachSubscription(payment.id, subscriptionId);

    return this.requirePayment(payment.id);
  }

  async fail(paymentId: string, reason: string, at: Date = this.currentDate()): Promise<Payment> {
    await this.requirePayment(paymentId);
    await this.deps.payments.markFailed(paymentId, reason, at);

    return this.requirePayment(paymentId);
  }

  async expire(paymentId: string, at: Date = this.currentDate()): Promise<Payment> {
    await this.requirePayment(paymentId);
    await this.deps.payments.markExpired(paymentId, at);

    return this.requirePayment(paymentId);
  }

  private currentDate(): Date {
    return this.deps.now?.() ?? new Date();
  }

  private async requirePayment(paymentId: string): Promise<Payment> {
    const payment = await this.deps.payments.getById(paymentId);

    if (payment === null) {
      throw new NotFoundError("Payment not found");
    }

    return payment;
  }
}
