# Templates

| #   | slug                   | subject es-MX                               | subject en                               | CTA es-MX -> URL var                    | secondary link              | variables                                                                                   |
| --- | ---------------------- | ------------------------------------------- | ---------------------------------------- | --------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | downgrade              | Tu plan ha sido degradado                   | Your plan has been downgraded            | Gestionar mi suscripción -> billingUrl  | -                           | planName, billingUrl, appUrl, supportEmail                                                  |
| 2   | failed-renewal         | Tu pago falló — periodo de gracia de 7 días | Your payment failed — 7-day grace period | Actualizar método de pago -> billingUrl | -                           | graceEnd, billingUrl, appUrl, supportEmail                                                  |
| 3   | grace-expired          | Tu plan ha sido degradado                   | Your plan has been downgraded            | Ver planes -> billingUrl                | -                           | planName, billingUrl, appUrl, supportEmail                                                  |
| 4   | renewal-7d             | Tu plan se renueva en 7 días                | Your plan renews in 7 days               | Gestionar mi suscripción -> billingUrl  | -                           | renewalDate, billingUrl, appUrl, supportEmail                                               |
| 5   | renewal-1d             | Tu plan se renueva mañana                   | Your plan renews tomorrow                | Ver mi suscripción -> billingUrl        | -                           | renewalDate, billingUrl, appUrl, supportEmail                                               |
| 6   | verify-email           | Verifica tu correo electrónico              | Verify your email address                | Verificar correo -> verifyUrl           | -                           | expiresIn, verifyUrl, appUrl, billingUrl, supportEmail                                      |
| 7   | receipt                | Tu recibo de pago — Aquí Suena              | Your payment receipt — Aquí Suena        | Ver mi suscripción -> billingUrl        | -                           | amount, method, planName, period, paidAt, paymentId, billingUrl, appUrl, supportEmail       |
| 8   | invoice-cfdi           | Tu factura fiscal (CFDI) está lista         | Your tax invoice (CFDI) is ready         | Descargar factura -> downloadUrl        | Ver mi cuenta -> billingUrl | planName, invoiceId, issuedAt, amount, downloadUrl, billingUrl, appUrl, supportEmail        |
| 9   | welcome                | Bienvenido a Aquí Suena                     | Welcome to Aquí Suena                    | Ir a mi panel -> ownerPortalUrl         | Ver planes -> billingUrl    | businessName, recommendedPlan, ownerPortalUrl, billingUrl, appUrl, supportEmail             |
| 10  | cancellation           | Tu cancelación ha sido confirmada           | Your cancellation has been confirmed     | Ver mi suscripción -> billingUrl        | Ver planes -> billingUrl    | activeUntil, planName, billingUrl, appUrl, supportEmail                                     |
| 11  | cancellation-immediate | Tu cancelación ha sido confirmada           | Your cancellation has been confirmed     | Ver mi suscripción -> billingUrl        | Ver planes -> billingUrl    | planName, billingUrl, appUrl, supportEmail                                                  |
| 12  | payment-pending        | Completa tu pago — Aquí Suena               | Complete your payment — Aquí Suena       | Continuar con el pago -> actionUrl      | -                           | actionUrl, amount, expiresAt, method, planName, reference, billingUrl, appUrl, supportEmail |

## Implementation status

The runtime source of truth is `renderer.ts` (TypeScript). The pre-rendered
`email-*.html` files in this folder are design references, not runtime inputs.
`render.js` no longer exists; it was migrated to `renderer.ts` with typed
`renderEmail(id, locale, vars)`.

`TEMPLATES.md` is the single source for the template contract. There is no
hand-maintained machine-readable copy; if one is ever needed, generate it from
`TEMPLATES.md` (or the renderer copy) instead of duplicating it.

Notifier owners and their call sites:

| Template                                                                                   | Notifier                                       | Live call site                       |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------ |
| 1 downgrade, 2 failed-renewal, 3 grace-expired, 10 cancellation, 11 cancellation-immediate | `TemplateSubscriptionNotifier`                 | subscription lifecycle (cancel, downgrade, failed-renewal, grace-expired, immediate cancel) |
| 4 renewal-7d, 5 renewal-1d                                                                 | `TemplateSubscriptionNotifier.renewalUpcoming` | fifteen-minute cron (renewal reminders) |
| 6 verify-email, 9 welcome                                                                  | `TemplateAccountNotifier`                      | none (needs the signup flow)         |
| 7 receipt, 12 payment-pending                                                              | `TemplatePaymentNotifier`                      | `CreatePayment` / `CompletePayment`  |
| 8 invoice-cfdi                                                                             | `TemplateCfdiNotifier.invoiceIssued`           | `billing.requestInvoice`             |

### Template 8 (invoice-cfdi): delivered with attachments

`TemplateCfdiNotifier` renders `invoice-cfdi` and hands the message to the transport
with the fiscal document attached, so the owner keeps the CFDI without depending on a
link: `CFDI-{uuid}.pdf` (the provider PDF) and `CFDI-{uuid}.xml` (the stamped XML
archived in R2).

- The CTA (`downloadUrl`) points at the billing page, not at the files. The button
  label still reads "Descargar factura"; rewording it is a copy decision, not a
  behavior change.
- The PDF is optional. When the PAC download or the R2 archive fails, the mail goes
  out with the XML alone and the failure is logged; `cfdi_invoices.pdf_key` stays
  null.
- Delivery never fails the request. A stamped CFDI is a fiscal fact: a render, send
  or download failure is reported through `onDeliveryError` with its stage and never
  becomes an HTTP error.
- A deleted account keeps its `cfdi_invoices` row for fiscal retention but is never
  emailed.
- The template also interpolates `{planName}`, so the notifier supplies it next to
  `invoiceId`, `issuedAt` and `amount`.

Owner-portal history and downloads are a separate slice: `CfdiInvoiceRepository` has
no `listByAccount`/`getById` yet, and serving the archived files needs an
authentication decision (presigned URL versus an authenticated endpoint).
