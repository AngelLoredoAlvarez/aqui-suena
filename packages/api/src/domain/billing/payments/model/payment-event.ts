export type PaymentEvent = {
  id: string;
  providerEventId: string;
  type: string;
  paymentId: string | null;
  payloadHash: string;
  livemode: boolean;
  processedAt: Date | null;
  createdAt: Date;
};

export type NewPaymentEvent = {
  readonly providerEventId: string;
  readonly type: string;
  readonly paymentId: string | null;
  readonly payloadHash: string;
  readonly livemode: boolean;
};

export interface PaymentEventRepository {
  record(input: NewPaymentEvent): Promise<PaymentEvent>;
  getByProviderEventId(id: string): Promise<PaymentEvent | null>;
  markProcessed(id: string, paymentId: string | null, processedAt: Date): Promise<void>;
}
