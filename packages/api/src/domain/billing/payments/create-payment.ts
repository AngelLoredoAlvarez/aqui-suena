import type { CompletePayment } from "@aqui-suena/api/domain/billing/payments/complete-payment";
import type {
  BillingInterval,
  Payment,
  PaymentMethod,
  PaymentRepository,
} from "@aqui-suena/api/domain/billing/payments/payment";
import type { PaymentNotifications } from "@aqui-suena/api/domain/billing/payments/payment-notifications";
import type {
  ChargeResult,
  PaymentCardWriter,
  PaymentCustomer,
  PaymentProvider,
} from "@aqui-suena/api/domain/billing/payments/payment-provider";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { ConflictError, NotFoundError, ValidationError } from "@aqui-suena/api/shared/domain-error";

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

export type CreatePaymentDependencies = {
  readonly payments: Pick<
    PaymentRepository,
    | "getById"
    | "getByIdempotencyKey"
    | "findOpenIntent"
    | "markExpired"
    | "create"
    | "markFailed"
    | "applyProviderResult"
  >;
  readonly plans: Pick<PlanRepository, "getById">;
  readonly provider: Pick<PaymentProvider, "createCardSource" | "createCharge">;
  readonly cards?: PaymentCardWriter;
  readonly complete: CompletePayment;
  readonly notifications: PaymentNotifications;
  readonly now?: () => Date;
};

/**
 * Validates a checkout, tokenizes a card when one is supplied, charges the
 * provider and lands the payment in its terminal state. Idempotency and the
 * open-intent rules live here so the same request never creates two payments.
 */
export class CreatePayment {
  constructor(private readonly deps: CreatePaymentDependencies) {}

  async execute(input: CreatePaymentInput): Promise<Payment> {
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

    const { savedCard, cardToken } = await this.resolveCard(input);

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

    if (charge.status === "pending") {
      await this.deps.notifications.pending(payment.id);
    }

    if (charge.status === "paid") {
      return this.deps.complete.execute(payment.id, now);
    }

    if (charge.status === "declined") {
      await this.deps.payments.markFailed(payment.id, charge.failureReason ?? "declined", now);
    } else if (charge.status === "expired") {
      await this.deps.payments.markExpired(payment.id, now);
    }

    return this.requirePayment(payment.id);
  }

  private async resolveCard(
    input: CreatePaymentInput,
  ): Promise<{ savedCard: CreatePaymentInput["savedCard"]; cardToken: string | undefined }> {
    if (input.method !== "card" || input.cardToken === undefined || this.deps.cards === undefined) {
      return { savedCard: input.savedCard, cardToken: input.cardToken };
    }

    const source = await this.deps.provider.createCardSource({
      customer: input.customer,
      token: input.cardToken,
      idempotencyKey: `${input.idempotencyKey}:card`,
    });

    await this.deps.cards.save(input.accountId, source);

    return {
      savedCard: { customerId: source.customerId, sourceId: source.sourceId },
      cardToken: undefined,
    };
  }

  private async requirePayment(paymentId: string): Promise<Payment> {
    const payment = await this.deps.payments.getById(paymentId);

    if (payment === null) {
      throw new NotFoundError("Payment not found");
    }

    return payment;
  }

  private currentDate(): Date {
    return this.deps.now?.() ?? new Date();
  }
}
