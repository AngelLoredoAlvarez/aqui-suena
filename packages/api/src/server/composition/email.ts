import type { CfdiNotifier } from "@aqui-suena/api/domain/billing/invoices/cfdi-notifier";
import { TemplateCfdiNotifier } from "@aqui-suena/api/domain/billing/invoices/template-cfdi-notifier";
import type { SubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/subscription-notifier";
import { TemplateSubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/template-subscription-notifier";
import type { EmailTemplateRenderer } from "@aqui-suena/api/domain/email/email-template";
import { createEmailTemplateRenderer } from "@aqui-suena/api/infrastructure/email/email-template-renderer";
import { ResendEmailSender } from "@aqui-suena/api/infrastructure/email/resend-email-sender";

const EMAIL_BILLING_PATH = "/cuenta/suscripcion";
const EMAIL_OWNER_PORTAL_PATH = "/panel";

/**
 * Every link in a transactional email is built from this base. It must be an
 * origin this deployment actually serves: a domain we do not own turns every CTA
 * into a dead link, so the default is local rather than a marketing URL.
 */
export const DEFAULT_EMAIL_APP_URL = "http://localhost:3000";

/**
 * Resend only accepts `onboarding@resend.dev` as the sender until a domain is
 * verified, so that is the honest default for a project without one.
 */
export const DEFAULT_EMAIL_FROM = "onboarding@resend.dev";

export type EmailSettings = {
  readonly apiKey?: string;
  readonly from?: string;
  readonly appUrl?: string;
  /** Defaults to the sender address: a support inbox we can actually receive at. */
  readonly supportEmail?: string;
};

/** Where every billing email links; invoice delivery reuses it as its CTA. */
export function emailBillingUrl(appUrl: string | undefined): string {
  return `${appUrl ?? DEFAULT_EMAIL_APP_URL}${EMAIL_BILLING_PATH}`;
}

function createRenderer(settings: EmailSettings): EmailTemplateRenderer {
  const from = settings.from ?? DEFAULT_EMAIL_FROM;

  return createEmailTemplateRenderer({
    appUrl: settings.appUrl ?? DEFAULT_EMAIL_APP_URL,
    supportEmail: settings.supportEmail ?? from,
    billingPath: EMAIL_BILLING_PATH,
    ownerPortalPath: EMAIL_OWNER_PORTAL_PATH,
  });
}

function createSender(settings: EmailSettings): ResendEmailSender {
  // `apiKey` is checked by every caller before this runs.
  return new ResendEmailSender({
    apiKey: settings.apiKey ?? "",
    from: settings.from ?? DEFAULT_EMAIL_FROM,
  });
}

export function createSubscriptionNotifier(
  settings: EmailSettings,
): SubscriptionNotifier | undefined {
  if (!settings.apiKey) {
    return undefined;
  }

  return new TemplateSubscriptionNotifier(createSender(settings), createRenderer(settings));
}

export function createCfdiNotifier(settings: EmailSettings): CfdiNotifier | undefined {
  if (!settings.apiKey) {
    return undefined;
  }

  return new TemplateCfdiNotifier(createSender(settings), createRenderer(settings));
}
