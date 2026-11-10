# Aquí Suena — transactional email templates

Product: Aquí Suena by 17Labs (open radio + local directory). The design targets
Resend as `{ to, subject, html }`; no sender is wired in production yet.

This folder holds **design artifacts only**; none of it is imported at runtime.
The runtime lives in `packages/api/src/infrastructure/email/`.

## Design artifacts (this folder)

- `SPEC.md` — the visual specification in words (tokens, spacing, hierarchy).
- `TEMPLATES.md` — the single source for the contract of the 10 templates:
  subject, preheader, CTA, secondary link and variables.
- `email-<n>-<slug>.{es-MX,en}.html` — pre-rendered output with sample data (20 files).
- `logo-aqui-suena-noche.svg` — app logo for dark backgrounds.

## Runtime (packages/api/src/infrastructure/email/)

- `renderer.ts` — ESM + TypeScript renderer. Imports `es-MX.json` and `en.json` as the
  single source of copy and exposes `renderEmail(id, locale, vars)` returning
  `{ subject, html }`.
- `es-MX.json`, `en.json` — runtime copy. Edit these, not a duplicate.
- `email-template-renderer.ts` — adapter that implements the domain port
  `EmailTemplateRenderer` and injects deployment links (`appUrl`, `supportEmail`,
  `billingUrl`, `ownerPortalUrl`).

`render.js` no longer exists; it was migrated to `renderer.ts` and the numeric index
API was replaced by template ids.

## Rendering

```ts
import { createEmailTemplateRenderer } from "@aqui-suena/api/infrastructure/email/email-template-renderer";

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
- Adding a language means extending `EMAIL_LOCALES`, adding `<code>.json` under
  `src/infrastructure/email/`, and registering it in the renderer's copy map.

## Notifier owners (no production call sites yet)

Nothing below is called in production: the notifiers are tested but no entry point
constructs them or a `ResendEmailSender`, so no email is sent.

- Subscription lifecycle: `TemplateSubscriptionNotifier` — downgrade, failed-renewal,
  grace-expired, renewal-7d, renewal-1d, cancellation.
- Account lifecycle: `TemplateAccountNotifier` — verify-email, welcome.
- Payments: `TemplatePaymentNotifier` — receipt.
- Blocked: `invoice-cfdi`. See the "Blocked" section in `TEMPLATES.md`.

## Logo caveat

The logo is inline SVG; Gmail and Outlook do not render it. In production use a PNG
with a transparent background (about 124×82 px for the symbol) with `alt` and fixed
dimensions. The same applies to the 17 Labs footer logo.
