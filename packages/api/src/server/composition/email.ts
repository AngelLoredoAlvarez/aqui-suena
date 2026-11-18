import type { CfdiNotifier } from "@aqui-suena/api/domain/billing/invoices/cfdi-notifier";
import { TemplateCfdiNotifier } from "@aqui-suena/api/domain/billing/invoices/template-cfdi-notifier";
import type { SubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/subscription-notifier";
import { TemplateSubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/template-subscription-notifier";
import { createEmailTemplateRenderer } from "@aqui-suena/api/infrastructure/email/email-template-renderer";
import { ResendEmailSender } from "@aqui-suena/api/infrastructure/email/resend-email-sender";

const EMAIL_APP_URL = "https://aquisuena.mx";
const EMAIL_SUPPORT_ADDRESS = "soporte@aquisuena.mx";
const EMAIL_BILLING_PATH = "/cuenta/suscripcion";
const EMAIL_OWNER_PORTAL_PATH = "/panel";
const DEFAULT_EMAIL_FROM = "Aquí Suena <no-reply@aquisuena.mx>";

/** The page every billing email links to; invoice delivery reuses it as its CTA. */
export const EMAIL_BILLING_URL = `${EMAIL_APP_URL}${EMAIL_BILLING_PATH}`;

function createRenderer() {
  return createEmailTemplateRenderer({
    appUrl: EMAIL_APP_URL,
    supportEmail: EMAIL_SUPPORT_ADDRESS,
    billingPath: EMAIL_BILLING_PATH,
    ownerPortalPath: EMAIL_OWNER_PORTAL_PATH,
  });
}

export function createSubscriptionNotifier(
  apiKey: string | undefined,
  from: string | undefined,
): SubscriptionNotifier | undefined {
  if (!apiKey) {
    return undefined;
  }

  const sender = new ResendEmailSender({ apiKey, from: from ?? DEFAULT_EMAIL_FROM });

  return new TemplateSubscriptionNotifier(sender, createRenderer());
}

export function createCfdiNotifier(
  apiKey: string | undefined,
  from: string | undefined,
): CfdiNotifier | undefined {
  if (!apiKey) {
    return undefined;
  }

  const sender = new ResendEmailSender({ apiKey, from: from ?? DEFAULT_EMAIL_FROM });

  return new TemplateCfdiNotifier(sender, createRenderer());
}
