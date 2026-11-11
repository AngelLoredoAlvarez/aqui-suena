export const EMAIL_LOCALES = ["es-MX", "en"] as const;

export type EmailLocale = (typeof EMAIL_LOCALES)[number];

export const DEFAULT_EMAIL_LOCALE: EmailLocale = "es-MX";

export const EMAIL_TEMPLATE_IDS = [
  "downgrade",
  "failed-renewal",
  "grace-expired",
  "renewal-7d",
  "renewal-1d",
  "verify-email",
  "receipt",
  "invoice-cfdi",
  "welcome",
  "cancellation",
  "cancellation-immediate",
] as const;

export type EmailTemplateId = (typeof EMAIL_TEMPLATE_IDS)[number];

/**
 * Variables already formatted for display (dates, currency, URLs).
 * The renderer never formats values; it only interpolates them.
 */
export type EmailTemplateVars = Readonly<Record<string, string>>;

export interface RenderedEmail {
  readonly subject: string;
  readonly html: string;
}

/**
 * Port for rendering a transactional email template.
 * Implementations own the HTML; callers own the business data.
 */
export interface EmailTemplateRenderer {
  render(id: EmailTemplateId, locale: EmailLocale, vars: EmailTemplateVars): RenderedEmail;
}

export function isEmailLocale(value: unknown): value is EmailLocale {
  return typeof value === "string" && (EMAIL_LOCALES as readonly string[]).includes(value);
}

/**
 * Coerces a stored value into a supported locale.
 * Persisted data never gets to crash rendering.
 */
export function resolveEmailLocale(value: unknown): EmailLocale {
  return isEmailLocale(value) ? value : DEFAULT_EMAIL_LOCALE;
}
