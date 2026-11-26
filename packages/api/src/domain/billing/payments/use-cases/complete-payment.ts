import type {
  Payment,
  PaymentRepository,
} from "@aqui-suena/api/domain/billing/payments/model/payment";
import type { PaymentSubscriptionWriter } from "@aqui-suena/api/domain/billing/payments/ports/payment-subscription-writer";
import type { PaymentNotifications } from "@aqui-suena/api/domain/billing/payments/use-cases/payment-notifications";
import {
  ConflictError,
  DataIntegrityError,
  NotFoundError,
} from "@aqui-suena/api/shared/domain-error";

const COMPLETION_RECOVERY_DELAY_MS = 5 * 60 * 1000;

export type CompletePaymentDependencies = {
  readonly payments: Pick<
    PaymentRepository,
    "getById" | "claimCompletion" | "releaseCompletion" | "attachSubscription"
  >;
  readonly subscriptions: Pick<PaymentSubscriptionWriter, "activate">;
  readonly notifications: PaymentNotifications;
  readonly now?: () => Date;
};

/**
 * Activates the subscription behind a paid payment. The compare-and-set claim
 * runs before activation so concurrent provider events cannot both create a
 * subscription; a failed activation releases the claim for a retry.
 */
export class CompletePayment {
  constructor(private readonly deps: CompletePaymentDependencies) {}

  async execute(paymentId: string, paidAt: Date = this.currentDate()): Promise<Payment> {
    const payment = await this.requirePayment(paymentId);
    const now = this.currentDate();

    if (payment.status === "completed") {
      if (payment.subscriptionId !== null) {
        return payment;
      }

      // A claimed payment without a subscription is either being activated by
      // another event or was interrupted. Give the first attempt time to finish,
      // then let a retry repair it.
      if (now.getTime() - payment.updatedAt.getTime() < COMPLETION_RECOVERY_DELAY_MS) {
        return payment;
      }
    } else if (payment.status !== "pending") {
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

    let claimed = false;

    if (payment.status === "pending") {
      claimed = await this.deps.payments.claimCompletion(payment.id, paidAt);

      if (!claimed) {
        return this.requirePayment(payment.id);
      }
    }

    try {
      const subscriptionId = await this.deps.subscriptions.activate({
        paymentId: payment.id,
        accountId: payment.accountId,
        planId: payment.planId,
        billingInterval: payment.billingInterval,
        periodStart: payment.periodStart,
        periodEnd: payment.periodEnd,
      });

      await this.deps.payments.attachSubscription(payment.id, subscriptionId);
    } catch (error) {
      if (claimed) {
        await this.deps.payments.releaseCompletion(payment.id);
      }

      throw error;
    }

    const completed = await this.requirePayment(payment.id);
    await this.deps.notifications.receipt(completed);

    return completed;
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
