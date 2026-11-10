# Aquí Suena — transactional email templates

Product: Aquí Suena by 17Labs (open radio + local directory). Email is sent through
Resend as `{ to, subject, html }`.

## Runtime pieces

- `renderer.ts` — the renderer. ESM + TypeScript, no dependencies. Single source of
  truth for markup and copy. Exposes `renderEmail(id, locale, vars)` returning
  `{ subject, html }`.
- `email-template-renderer.ts` — adapter that implements the domain port
  `EmailTemplateRenderer` and injects deployment links (`appUrl`, `supportEmail`,
  `billingUrl`, `ownerPortalUrl`).
- `SPEC.md` — the visual specification in words (tokens, spacing, hierarchy).
- `TEMPLATES.md` and `manifest.json` — the design contract for the 10 templates:
  subject, preheader, CTA, secondary link and variables.
- `es-MX.json`, `en.json` — copy exported by the design tool. Reference only; the
  renderer carries the runtime copy.
- `email-<n>-<slug>.{es-MX,en}.html` — pre-rendered output with sample data (20 files).
  Never consumed at runtime.
- `logo-aqui-suena-noche.svg` — app logo for dark backgrounds.

`render.js` no longer exists. It was migrated to `renderer.ts` and the numeric index
API was replaced by template ids.

## Rendering

```ts
import { createEmailTemplateRenderer } from "@aqui-suena/api/infrastructure/billing/email-templates/email-template-renderer";

const renderer = createEmailTemplateRenderer({
  appUrl: "https://aquisuena.mx",
  supportEmail: "soporte@aquisuena.mx",
});

const { subject, html } = renderer.render("receipt", "es-MX", {
  planName: "Oficios & Servicios",
  period: "Mensual",
  amount: "$49.00 MXN",
  paidAt: "1 de marzo de 2026",
  paymentId: "pay_8F2K91XQ",
});
```

Rules:

- Every variable must be formatted before it reaches the renderer. Use
  `formatEmailDate`, `formatEmailMoney` and `formatEmailHours` from
  `domain/email/email-format.ts`.
- A missing variable throws instead of shipping a literal `{placeholder}`.
- Injected values are HTML-escaped, so a business name cannot break the markup.
- There is no sample-data fallback. Production data is always explicit.

## Locale

- Supported locales are `es-MX` and `en`; the default is `es-MX`.
- Stored account values are normalized with `resolveEmailLocale` before rendering, so
  an unknown value falls back to the default instead of crashing the renderer.
- Adding a language means extending `EMAIL_LOCALES`, the copy map in `renderer.ts`,
  and any localized labels owned by a notifier (billing period, durations).

## Wired send sites

- Subscription lifecycle: `TemplateSubscriptionNotifier` — downgrade, failed-renewal,
  grace-expired, renewal-7d, renewal-1d, cancellation.
- Account lifecycle: `TemplateAccountNotifier` — verify-email, welcome.
- Payments: `TemplatePaymentNotifier` — receipt.
- Blocked: `invoice-cfdi`. See the "Blocked" section in `TEMPLATES.md`.

## Logo caveat

The logo is inline SVG; Gmail and Outlook do not render it. In production use a PNG
with a transparent background (about 124×82 px for the symbol) with `alt` and fixed
dimensions. The same applies to the 17 Labs footer logo.
