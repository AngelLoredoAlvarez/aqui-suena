import type { Payment, PaymentRepository } from "@aqui-suena/api/domain/billing/payments/payment";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";

export type FailPaymentDependencies = {
  readonly payments: Pick<PaymentRepository, "getById" | "markFailed">;
  readonly now?: () => Date;
};

export class FailPayment {
  constructor(private readonly deps: FailPaymentDependencies) {}

  async execute(
    paymentId: string,
    reason: string,
    at: Date = this.currentDate(),
  ): Promise<Payment> {
    await this.requirePayment(paymentId);
    await this.deps.payments.markFailed(paymentId, reason, at);

    return this.requirePayment(paymentId);
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
