import type { PaymentRepository } from "@aqui-suena/api/domain/billing/payments/payment";
import type { PaymentProvider } from "@aqui-suena/api/domain/billing/payments/payment-provider";

const DEFAULT_LIMIT = 5;

export interface PaymentSweepService {
  readonly complete: { execute(paymentId: string, paidAt?: Date): Promise<unknown> };
  readonly fail: { execute(paymentId: string, reason: string, at?: Date): Promise<unknown> };
  readonly expire: { execute(paymentId: string, at?: Date): Promise<unknown> };
}

export type RefreshPendingPaymentsDependencies = {
  readonly payments: Pick<PaymentRepository, "listPendingWithProviderOrder">;
  readonly provider: Pick<PaymentProvider, "getOrder">;
  readonly service: PaymentSweepService;
  readonly limit?: number;
  readonly now?: () => Date;
  readonly onError?: (message: string, paymentId: string) => void;
};

export class RefreshPendingPayments {
  private readonly deps: RefreshPendingPaymentsDependencies;

  constructor(deps: RefreshPendingPaymentsDependencies) {
    this.deps = deps;
  }

  async execute(): Promise<number> {
    const now = this.deps.now?.() ?? new Date();
    const pending = await this.deps.payments.listPendingWithProviderOrder(
      this.deps.limit ?? DEFAULT_LIMIT,
    );
    let processed = 0;

    for (const payment of pending) {
      if (payment.providerOrderId === null) continue;

      try {
        const charge = await this.deps.provider.getOrder(payment.providerOrderId);

        if (charge.status === "paid") {
          await this.deps.service.complete.execute(payment.id, now);
          processed += 1;
        } else if (charge.status === "declined") {
          await this.deps.service.fail.execute(payment.id, charge.failureReason ?? "declined", now);
          processed += 1;
        } else if (charge.status === "expired") {
          await this.deps.service.expire.execute(payment.id, now);
          processed += 1;
        }
      } catch (error) {
        this.deps.onError?.(error instanceof Error ? error.message : "unknown error", payment.id);
      }
    }

    return processed;
  }
}
