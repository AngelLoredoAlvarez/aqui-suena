import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type {
  BillingInterval,
  Payment,
  PaymentMethod,
  PaymentRepository,
} from "@aqui-suena/api/domain/billing/payments/model/payment";
import type { PaymentCustomer } from "@aqui-suena/api/domain/billing/payments/ports/payment-provider";
import type {
  CreatePayment,
  CreatePaymentInput,
} from "@aqui-suena/api/domain/billing/payments/use-cases/create-payment";
import { hasPendingForOtherPlan } from "@aqui-suena/api/domain/billing/payments/use-cases/has-pending-for-other-plan";
import { addInterval } from "@aqui-suena/api/domain/billing/subscriptions/model/period";
import type {
  Subscription,
  SubscriptionRepository,
} from "@aqui-suena/api/domain/billing/subscriptions/model/subscription";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import type { Plan, PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { ConflictError, NotFoundError, ValidationError } from "@aqui-suena/api/shared/domain-error";

const REFERENCE_TTL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type CheckoutServiceDependencies = {
  readonly create: Pick<CreatePayment, "execute">;
  readonly payments: Pick<PaymentRepository, "listPendingByAccount">;
  readonly subscriptions: Pick<SubscriptionRepository, "getActive">;
  readonly plans: Pick<PlanRepository, "getById">;
  readonly accounts: Pick<AccountRepository, "getSavedCard">;
  readonly returnUrl?: string;
  readonly now?: () => Date;
};

export type CheckoutInput = {
  readonly accountId: string;
  readonly planId: PlanId;
  readonly billingInterval: BillingInterval;
  readonly method: PaymentMethod;
  readonly idempotencyKey: string;
  readonly cardToken?: string;
  readonly customer: PaymentCustomer;
};

export class CheckoutService {
  private readonly deps: CheckoutServiceDependencies;

  constructor(deps: CheckoutServiceDependencies) {
    this.deps = deps;
  }

  async execute(input: CheckoutInput): Promise<Payment> {
    const now = this.currentDate();
    const plan = await this.requireBillablePlan(input.planId);

    if (await hasPendingForOtherPlan(this.deps.payments, input.accountId, input.planId, now)) {
      throw new ConflictError(
        "A payment for another plan is pending; finish it or wait for it to expire before changing plans",
      );
    }

    const current = await this.deps.subscriptions.getActive(input.accountId, now);
    const period = await this.resolvePeriod(input, plan, current, now);

    let savedCard: CreatePaymentInput["savedCard"];

    if (input.method === "card" && input.cardToken === undefined) {
      const card = await this.deps.accounts.getSavedCard(input.accountId);

      if (card === null) {
        throw new ValidationError("cardToken is required for card payments");
      }

      savedCard = { customerId: card.customerId, sourceId: card.sourceId };
    }

    const expiresAt =
      input.method === "card" ? undefined : new Date(now.getTime() + REFERENCE_TTL_DAYS * DAY_MS);

    return this.deps.create.execute({
      accountId: input.accountId,
      planId: input.planId,
      billingInterval: input.billingInterval,
      method: input.method,
      idempotencyKey: input.idempotencyKey,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      customer: input.customer,
      cardToken: input.cardToken,
      savedCard,
      expiresAt,
      returnUrl: this.deps.returnUrl,
    });
  }

  private async resolvePeriod(
    input: CheckoutInput,
    plan: Plan,
    current: Subscription | null,
    now: Date,
  ): Promise<{ periodStart: Date; periodEnd: Date }> {
    if (current === null) {
      return { periodStart: now, periodEnd: addInterval(now, input.billingInterval) };
    }

    const currentPlan = await this.getPlan(current.planId);
    const paidUntil = current.endsAt !== null && current.endsAt > now ? current.endsAt : now;

    if (current.planId === input.planId) {
      return {
        periodStart: paidUntil,
        periodEnd: addInterval(paidUntil, input.billingInterval),
      };
    }

    if (plan.entitlements.priority > currentPlan.entitlements.priority) {
      return {
        periodStart: now,
        periodEnd: addInterval(paidUntil, input.billingInterval),
      };
    }

    throw new ConflictError("Downgrade is scheduled at the end of the paid period");
  }

  private async getPlan(planId: PlanId): Promise<Plan> {
    const plan = await this.deps.plans.getById(planId);

    if (plan === null) {
      throw new NotFoundError("Plan not found");
    }

    return plan;
  }

  private async requireBillablePlan(planId: PlanId): Promise<Plan> {
    const plan = await this.getPlan(planId);

    if (!plan.active || plan.priceMonthly <= 0) {
      throw new ValidationError("Plan is not billable");
    }

    return plan;
  }

  private currentDate(): Date {
    return this.deps.now?.() ?? new Date();
  }
}
