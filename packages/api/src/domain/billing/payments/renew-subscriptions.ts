import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type {
  Payment,
  PaymentMethod,
  PaymentRepository,
} from "@aqui-suena/api/domain/billing/payments/payment";
import type { PaymentService } from "@aqui-suena/api/domain/billing/payments/payment-service";
import { addInterval } from "@aqui-suena/api/domain/billing/subscriptions/period";
import type {
  Subscription,
  SubscriptionRepository,
} from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import type { SubscriptionService } from "@aqui-suena/api/domain/billing/subscriptions/subscription-service";
import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LEAD_DAYS = 7;
const CARD_LEAD_DAYS = 3;
const MAX_CARD_ATTEMPTS = 3;
const REFERENCE_GRACE_DAYS = 7;
const DEFAULT_LIMIT = 5;

export type RenewSubscriptionsDependencies = {
  readonly subscriptions: Pick<
    SubscriptionRepository,
    "listActiveEndingBefore" | "listGraceExpired"
  >;
  readonly payments: Pick<PaymentRepository, "listBySubscription">;
  readonly paymentService: Pick<PaymentService, "create">;
  readonly accounts: Pick<AccountRepository, "getById" | "getSavedCard">;
  readonly plans: Pick<PlanRepository, "getById">;
  readonly businesses?: Pick<BusinessRepository, "listAllByAccount">;
  readonly service: Pick<SubscriptionService, "failRenewal" | "downgradeExpiredGrace">;
  readonly limit?: number;
  readonly now?: () => Date;
  readonly onError?: (message: string, subscriptionId: string) => void;
};

export class RenewSubscriptions {
  private readonly deps: RenewSubscriptionsDependencies;

  constructor(deps: RenewSubscriptionsDependencies) {
    this.deps = deps;
  }

  async execute(): Promise<number> {
    const now = this.deps.now?.() ?? new Date();
    const limit = this.deps.limit ?? DEFAULT_LIMIT;
    const deadline = new Date(now.getTime() + MAX_LEAD_DAYS * DAY_MS);
    const due = await this.deps.subscriptions.listActiveEndingBefore(deadline, limit);
    let renewed = 0;

    for (const subscription of due) {
      try {
        if (await this.processDue(subscription, now)) renewed += 1;
      } catch (error) {
        this.deps.onError?.(
          error instanceof Error ? error.message : "unknown error",
          subscription.id,
        );
      }
    }

    const expiredGrace = await this.deps.subscriptions.listGraceExpired(now, limit);

    for (const subscription of expiredGrace) {
      try {
        await this.downgrade(subscription, now);
      } catch (error) {
        this.deps.onError?.(
          error instanceof Error ? error.message : "unknown error",
          subscription.id,
        );
      }
    }

    return renewed;
  }

  private async processDue(subscription: Subscription, now: Date): Promise<boolean> {
    if (subscription.endsAt === null) return false;

    const account = await this.deps.accounts.getById(subscription.accountId);

    if (account === null || account.deletedAt != null) return false;

    const history = await this.deps.payments.listBySubscription(subscription.id);
    const periodStart = subscription.endsAt;

    if (periodStart <= now) {
      if (history.some((payment) => isCompletedFor(payment, periodStart))) return false;

      await this.deps.service.failRenewal(subscription.id, now, {
        recipientEmail: account.email,
        locale: account.locale,
      });

      return false;
    }

    const daysUntilEnd = (periodStart.getTime() - now.getTime()) / DAY_MS;
    const savedCard = await this.deps.accounts.getSavedCard(subscription.accountId);
    const method = methodFor(savedCard !== null, lastCompleted(history));
    const lead = method === "card" ? CARD_LEAD_DAYS : MAX_LEAD_DAYS;

    if (daysUntilEnd > lead) return false;

    if (history.some((payment) => isPendingFor(payment, periodStart))) return false;

    const failedAttempts = history.filter((payment) => isFailedFor(payment, periodStart)).length;

    if (method === "card" && failedAttempts >= MAX_CARD_ATTEMPTS) return false;

    await this.deps.paymentService.create({
      accountId: subscription.accountId,
      planId: subscription.planId,
      billingInterval: subscription.billingInterval,
      method,
      idempotencyKey: `sub:${subscription.id}:${periodStart.toISOString()}:${failedAttempts + 1}`,
      periodStart,
      periodEnd: addInterval(periodStart, subscription.billingInterval),
      customer: {
        name: account.fiscalProfile?.legalName ?? account.email,
        email: account.email,
      },
      ...(method === "card" && savedCard !== null
        ? { savedCard: { customerId: savedCard.customerId, sourceId: savedCard.sourceId } }
        : {}),
      ...(method === "card"
        ? {}
        : {
            expiresAt: new Date(periodStart.getTime() + REFERENCE_GRACE_DAYS * DAY_MS),
          }),
    });

    return true;
  }

  private async downgrade(subscription: Subscription, now: Date): Promise<void> {
    const account = await this.deps.accounts.getById(subscription.accountId);

    if (account === null) return;

    const plan = await this.deps.plans.getById("community");
    const options = {
      now,
      recipientEmail: account.email,
      locale: account.locale,
    };

    if (this.deps.businesses !== undefined && plan !== null) {
      const businesses = await this.deps.businesses.listAllByAccount(subscription.accountId);
      const visibleBusinessIds = businesses
        .slice(0, plan.entitlements.maxBusinesses)
        .map((business) => business.id);

      await this.deps.service.downgradeExpiredGrace(subscription.id, "community", {
        ...options,
        visibleBusinessIds,
      });

      return;
    }

    await this.deps.service.downgradeExpiredGrace(subscription.id, "community", options);
  }
}

function lastCompleted(history: Payment[]): Payment | null {
  return (
    history
      .filter((payment) => payment.status === "completed")
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null
  );
}

function methodFor(hasSavedCard: boolean, last: Payment | null): PaymentMethod {
  if (hasSavedCard) return "card";

  return last?.method === "spei" ? "spei" : "oxxo";
}

function isCompletedFor(payment: Payment, periodStart: Date): boolean {
  return payment.status === "completed" && isSamePeriod(payment, periodStart);
}

function isPendingFor(payment: Payment, periodStart: Date): boolean {
  return payment.status === "pending" && isSamePeriod(payment, periodStart);
}

function isFailedFor(payment: Payment, periodStart: Date): boolean {
  return payment.status === "failed" && isSamePeriod(payment, periodStart);
}

function isSamePeriod(payment: Payment, periodStart: Date): boolean {
  return payment.periodStart !== null && payment.periodStart.getTime() === periodStart.getTime();
}
