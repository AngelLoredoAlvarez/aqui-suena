import type { SubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/subscription-notifier";
import { TemplateSubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/template-subscription-notifier";
import { createEmailTemplateRenderer } from "@aqui-suena/api/infrastructure/email/email-template-renderer";
import { ResendEmailSender } from "@aqui-suena/api/infrastructure/email/resend-email-sender";

const EMAIL_APP_URL = "https://aquisuena.mx";
const EMAIL_SUPPORT_ADDRESS = "soporte@aquisuena.mx";
const EMAIL_BILLING_PATH = "/cuenta/suscripcion";
const EMAIL_OWNER_PORTAL_PATH = "/panel";
const DEFAULT_EMAIL_FROM = "Aquí Suena <no-reply@aquisuena.mx>";

export function createSubscriptionNotifier(
  apiKey: string | undefined,
  from: string | undefined,
): SubscriptionNotifier | undefined {
  if (!apiKey) {
    return undefined;
  }

  const sender = new ResendEmailSender({ apiKey, from: from ?? DEFAULT_EMAIL_FROM });

  const renderer = createEmailTemplateRenderer({
    appUrl: EMAIL_APP_URL,
    supportEmail: EMAIL_SUPPORT_ADDRESS,
    billingPath: EMAIL_BILLING_PATH,
    ownerPortalPath: EMAIL_OWNER_PORTAL_PATH,
  });

  return new TemplateSubscriptionNotifier(sender, renderer);
}
