import type { FiscalProfile } from "@aqui-suena/api/domain/billing/fiscal/fiscal-profile";
import type { EmailLocale } from "@aqui-suena/api/domain/email/email-template";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";

export interface Account {
  readonly id: string;
  readonly email: string;
  readonly planId: PlanId;
  readonly locale: EmailLocale;
  readonly fiscalProfile?: FiscalProfile | null;
}

export const DEFAULT_ACCOUNT_PLAN: PlanId = "community";
export const DEFAULT_ACCOUNT_LOCALE: EmailLocale = "es-MX";

/** Sessions carry the email as-is; the account row stores one canonical form. */
export function normalizeAccountEmail(email: string): string {
  return email.trim().toLowerCase();
}
