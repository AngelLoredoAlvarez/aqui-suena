import type { BillingInterval } from "@aqui-suena/api/domain/billing/payments/payment";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";

export type ActivateSubscriptionInput = {
  readonly paymentId: string;
  readonly accountId: string;
  readonly planId: PlanId;
  readonly billingInterval: BillingInterval;
  readonly periodStart: Date;
  readonly periodEnd: Date;
};

export interface PaymentSubscriptionWriter {
  activate(input: ActivateSubscriptionInput): Promise<string>;
}
