import type { FiscalProfile } from "@aqui-suena/api/domain/accounts/fiscal-profile";
import type { EmailLocale } from "@aqui-suena/api/domain/email/email-template";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";

export interface Account {
  readonly id: string;
  readonly email: string;
  readonly planId: PlanId;
  readonly locale: EmailLocale;
  readonly fiscalProfile?: FiscalProfile | null;
  readonly deletedAt?: Date | null;
}

export const DEFAULT_ACCOUNT_PLAN: PlanId = "community";
export const DEFAULT_ACCOUNT_LOCALE: EmailLocale = "es-MX";

/** Sessions carry the email as-is; the account row stores one canonical form. */
export function normalizeAccountEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Tombstone email for a deleted account: not deliverable, carries no personal
 * data, and derived from the id so it can never collide with a real address.
 */
export function anonymizedAccountEmail(id: string): string {
  return `deleted-${id}@deleted.invalid`;
}
