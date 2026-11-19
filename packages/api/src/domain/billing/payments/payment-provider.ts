import type {
  BillingInterval,
  PaymentMethod,
  PaymentProviderDetails,
} from "@aqui-suena/api/domain/billing/payments/payment";

export type PaymentCustomer = {
  readonly name: string;
  readonly email: string;
  readonly phone?: string;
};

export type CardDetails = {
  readonly brand: string;
  readonly last4: string;
  readonly expMonth: number;
  readonly expYear: number;
};

export type CardSource = {
  readonly customerId: string;
  readonly sourceId: string;
  readonly card?: CardDetails;
};

export type CreateCardSourceInput = {
  readonly customer: PaymentCustomer;
  readonly token: string;
  readonly idempotencyKey?: string;
};

export type CreateChargeInput = {
  readonly paymentId: string;
  readonly accountId: string;
  readonly amount: number;
  readonly currency: string;
  readonly method: PaymentMethod;
  readonly billingInterval: BillingInterval;
  readonly description: string;
  readonly customer: PaymentCustomer;
  readonly cardToken?: string;
  readonly savedCard?: {
    readonly customerId: string;
    readonly sourceId: string;
  };
  readonly expiresAt?: Date;
  readonly returnUrl?: string;
  readonly idempotencyKey: string;
};

export type ChargeStatus = "paid" | "pending" | "declined" | "expired";

export type ChargeResult = PaymentProviderDetails & {
  readonly status: ChargeStatus;
  readonly card?: CardDetails;
};

export class PaymentProviderRejection extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "PaymentProviderRejection";
    this.detail = detail;
  }
}

export interface PaymentProvider {
  createCardSource(input: CreateCardSourceInput): Promise<CardSource>;
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  getOrder(providerOrderId: string): Promise<ChargeResult>;
}

export interface PaymentCardWriter {
  save(accountId: string, card: CardSource): Promise<void>;
}
