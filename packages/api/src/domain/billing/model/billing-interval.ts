import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";

export const BILLING_INTERVALS = ["monthly", "annual"] as const;

export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export function parseBillingInterval(value: unknown): BillingInterval {
  if (typeof value === "string" && (BILLING_INTERVALS as readonly string[]).includes(value)) {
    return value as BillingInterval;
  }

  throw new DataIntegrityError("billingInterval", value);
}
