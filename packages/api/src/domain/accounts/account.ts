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
