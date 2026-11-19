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
};

export interface PaymentProvider {
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  getOrder(providerOrderId: string): Promise<ChargeResult>;
}
