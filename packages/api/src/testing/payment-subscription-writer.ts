import type {
  ActivateSubscriptionInput,
  PaymentSubscriptionWriter,
} from "@aqui-suena/api/domain/billing/payments/payment-subscription-writer";

export class FakePaymentSubscriptionWriter implements PaymentSubscriptionWriter {
  readonly calls: ActivateSubscriptionInput[] = [];
  error: Error | null = null;
  private sequence = 0;

  async activate(input: ActivateSubscriptionInput): Promise<string> {
    this.calls.push(input);

    if (this.error !== null) throw this.error;

    this.sequence += 1;

    return `sub-${this.sequence}`;
  }
}
