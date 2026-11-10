import type { EmailLocale } from "@aqui-suena/api/domain/email/email-template";

const HOURS_LABELS: Record<EmailLocale, readonly [singular: string, plural: string]> = {
  "es-MX": ["hora", "horas"],
  en: ["hour", "hours"],
};

export function formatEmailDate(locale: EmailLocale, date: Date): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date);
}

export function formatEmailMoney(
  locale: EmailLocale,
  minorUnits: number,
  currency = "MXN",
): string {
  const amount = new Intl.NumberFormat(locale, { minimumFractionDigits: 2 }).format(
    minorUnits / 100,
  );

  return `$${amount} ${currency}`;
}

export function formatEmailHours(locale: EmailLocale, hours: number): string {
  const [singular, plural] = HOURS_LABELS[locale];

  return `${hours} ${hours === 1 ? singular : plural}`;
}
