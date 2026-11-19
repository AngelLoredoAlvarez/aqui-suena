import type {
  CardSource,
  PaymentCardWriter,
} from "@aqui-suena/api/domain/billing/payments/payment-provider";

export class FakePaymentCardWriter implements PaymentCardWriter {
  readonly calls: Array<{ accountId: string; card: CardSource }> = [];
  error: Error | null = null;

  async save(accountId: string, card: CardSource): Promise<void> {
    this.calls.push({ accountId, card });

    if (this.error !== null) throw this.error;
  }
}
