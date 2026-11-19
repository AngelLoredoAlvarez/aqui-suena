import type {
  ChargeResult,
  CreateChargeInput,
  PaymentProvider,
} from "@aqui-suena/api/domain/billing/payments/payment-provider";

export class FakePaymentProvider implements PaymentProvider {
  readonly calls: CreateChargeInput[] = [];
  readonly orderCalls: string[] = [];
  result: ChargeResult = {
    providerOrderId: "ord-1",
    providerChargeId: "chg-1",
    status: "paid",
    reference: null,
    nextActionUrl: null,
    expiresAt: null,
    failureReason: null,
  };
  error: Error | null = null;

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    this.calls.push(input);

    if (this.error !== null) throw this.error;

    return this.result;
  }

  async getOrder(providerOrderId: string): Promise<ChargeResult> {
    this.orderCalls.push(providerOrderId);

    if (this.error !== null) throw this.error;

    return this.result;
  }
}
