import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type {
  Payment,
  PaymentRepository,
} from "@aqui-suena/api/domain/billing/payments/model/payment";
import type { PaymentNotifier } from "@aqui-suena/api/domain/billing/payments/ports/payment-notifier";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";

export type PaymentNotificationsDependencies = {
  readonly payments: PaymentRepository;
  readonly plans: PlanRepository;
  readonly accounts?: Pick<AccountRepository, "getById">;
  readonly notifier?: PaymentNotifier;
  readonly onDeliveryError?: (
    error: unknown,
    stage: "receipt" | "pending",
    paymentId: string,
  ) => void;
  readonly now?: () => Date;
};

/**
 * Turns a payment into the receipt/pending emails. It owns the "resolve the
 * account and plan, build the payload, deliver it" side-effect, so the payment
 * state machine stays about state. Every failure is reported through
 * `onDeliveryError` and never fails the payment itself.
 */
export class PaymentNotifications {
  private readonly deps: PaymentNotificationsDependencies;

  constructor(deps: PaymentNotificationsDependencies) {
    this.deps = deps;
  }

  async receipt(payment: Payment): Promise<void> {
    const { accounts, notifier } = this.deps;

    if (accounts === undefined || notifier === undefined) return;

    try {
      const account = await accounts.getById(payment.accountId);

      if (account === null || account.deletedAt) return;

      const plan = payment.planId === null ? null : await this.deps.plans.getById(payment.planId);

      await notifier.paymentReceipt(
        { email: account.email, locale: account.locale },
        {
          paymentId: payment.id,
          planName: plan?.name ?? payment.planId ?? "Plan",
          billingPeriod: payment.billingInterval,
          amountMinorUnits: payment.amount,
          currency: payment.currency,
          method: payment.method,
          paidAt: payment.paidAt ?? this.currentDate(),
        },
      );
    } catch (error) {
      this.deps.onDeliveryError?.(error, "receipt", payment.id);
    }
  }

  async pending(paymentId: string): Promise<void> {
    const payment = await this.deps.payments.getById(paymentId);

    if (payment === null) return;
    if (payment.reference === null && payment.nextActionUrl === null) return;

    const { accounts, notifier } = this.deps;

    if (accounts === undefined || notifier === undefined) return;

    try {
      const account = await accounts.getById(payment.accountId);

      if (account === null || account.deletedAt) return;

      const plan = payment.planId === null ? null : await this.deps.plans.getById(payment.planId);

      await notifier.paymentPending(
        { email: account.email, locale: account.locale },
        {
          paymentId: payment.id,
          planName: plan?.name ?? payment.planId ?? "Plan",
          method: payment.method,
          amountMinorUnits: payment.amount,
          currency: payment.currency,
          reference: payment.reference,
          expiresAt: payment.expiresAt,
          nextActionUrl: payment.nextActionUrl,
        },
      );
    } catch (error) {
      this.deps.onDeliveryError?.(error, "pending", payment.id);
    }
  }

  private currentDate(): Date {
    return this.deps.now?.() ?? new Date();
  }
}
