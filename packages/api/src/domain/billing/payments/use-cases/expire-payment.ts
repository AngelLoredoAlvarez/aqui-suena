import type {
  Payment,
  PaymentRepository,
} from "@aqui-suena/api/domain/billing/payments/model/payment";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";

export type ExpirePaymentDependencies = {
  readonly payments: Pick<PaymentRepository, "getById" | "markExpired">;
  readonly now?: () => Date;
};

export class ExpirePayment {
  constructor(private readonly deps: ExpirePaymentDependencies) {}

  async execute(paymentId: string, at: Date = this.currentDate()): Promise<Payment> {
    await this.requirePayment(paymentId);
    await this.deps.payments.markExpired(paymentId, at);

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
