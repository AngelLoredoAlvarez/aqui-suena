import type { PlanId } from "@aqui-suena/api/domain/billing/entitlements";
import type { EmailLocale } from "@aqui-suena/api/domain/email/email-template";

export interface Account {
  readonly id: string;
  readonly email: string;
  readonly planId: PlanId;
  readonly locale: EmailLocale;
}
