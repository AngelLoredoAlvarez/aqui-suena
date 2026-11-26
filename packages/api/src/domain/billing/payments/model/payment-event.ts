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

export class InMemoryPaymentEventRepository implements PaymentEventRepository {
  constructor(private readonly store: PaymentEvent[] = []) {}

  async record(input: NewPaymentEvent): Promise<PaymentEvent> {
    const existing = this.store.find((event) => event.providerEventId === input.providerEventId);

    if (existing !== undefined) return existing;

    const event: PaymentEvent = {
      id: crypto.randomUUID(),
      providerEventId: input.providerEventId,
      type: input.type,
      paymentId: input.paymentId,
      payloadHash: input.payloadHash,
      livemode: input.livemode,
      processedAt: null,
      createdAt: new Date(),
    };

    this.store.push(event);

    return event;
  }

  async getByProviderEventId(id: string): Promise<PaymentEvent | null> {
    return this.store.find((event) => event.providerEventId === id) ?? null;
  }

  async markProcessed(id: string, paymentId: string | null, processedAt: Date): Promise<void> {
    const event = this.store.find((candidate) => candidate.id === id);

    if (event === undefined) return;

    event.paymentId = paymentId;
    event.processedAt = processedAt;
  }
}
