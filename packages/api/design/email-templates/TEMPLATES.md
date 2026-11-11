# Templates

| #   | slug                   | subject es-MX                               | subject en                               | CTA es-MX -> URL var                    | secondary link              | variables                                                                            |
| --- | ---------------------- | ------------------------------------------- | ---------------------------------------- | --------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------ |
| 1   | downgrade              | Tu plan ha sido degradado                   | Your plan has been downgraded            | Gestionar mi suscripción -> billingUrl  | -                           | planName, billingUrl, appUrl, supportEmail                                           |
| 2   | failed-renewal         | Tu pago falló — periodo de gracia de 7 días | Your payment failed — 7-day grace period | Actualizar método de pago -> billingUrl | -                           | graceEnd, billingUrl, appUrl, supportEmail                                           |
| 3   | grace-expired          | Tu plan ha sido degradado                   | Your plan has been downgraded            | Ver planes -> billingUrl                | -                           | planName, billingUrl, appUrl, supportEmail                                           |
| 4   | renewal-7d             | Tu plan se renueva en 7 días                | Your plan renews in 7 days               | Gestionar mi suscripción -> billingUrl  | -                           | renewalDate, billingUrl, appUrl, supportEmail                                        |
| 5   | renewal-1d             | Tu plan se renueva mañana                   | Your plan renews tomorrow                | Ver mi suscripción -> billingUrl        | -                           | renewalDate, billingUrl, appUrl, supportEmail                                        |
| 6   | verify-email           | Verifica tu correo electrónico              | Verify your email address                | Verificar correo -> verifyUrl           | -                           | expiresIn, verifyUrl, appUrl, billingUrl, supportEmail                               |
| 7   | receipt                | Tu recibo de pago — Aquí Suena              | Your payment receipt — Aquí Suena        | Ver mi suscripción -> billingUrl        | -                           | amount, planName, period, paidAt, paymentId, billingUrl, appUrl, supportEmail        |
| 8   | invoice-cfdi           | Tu factura fiscal (CFDI) está lista         | Your tax invoice (CFDI) is ready         | Descargar factura -> downloadUrl        | Ver mi cuenta -> billingUrl | planName, invoiceId, issuedAt, amount, downloadUrl, billingUrl, appUrl, supportEmail |
| 9   | welcome                | Bienvenido a Aquí Suena                     | Welcome to Aquí Suena                    | Ir a mi panel -> ownerPortalUrl         | Ver planes -> billingUrl    | businessName, recommendedPlan, ownerPortalUrl, billingUrl, appUrl, supportEmail      |
| 10  | cancellation           | Tu cancelación ha sido confirmada           | Your cancellation has been confirmed     | Ver mi suscripción -> billingUrl        | Ver planes -> billingUrl    | activeUntil, planName, billingUrl, appUrl, supportEmail                              |
| 11  | cancellation-immediate | Tu cancelación ha sido confirmada           | Your cancellation has been confirmed     | Ver mi suscripción -> billingUrl        | Ver planes -> billingUrl    | planName, billingUrl, appUrl, supportEmail                                           |

## Implementation status

The runtime source of truth is `renderer.ts` (TypeScript). The pre-rendered
`email-*.html` files in this folder are design references, not runtime inputs.
`render.js` no longer exists; it was migrated to `renderer.ts` with typed
`renderEmail(id, locale, vars)`.

`TEMPLATES.md` is the single source for the template contract. There is no
hand-maintained machine-readable copy; if one is ever needed, generate it from
`TEMPLATES.md` (or the renderer copy) instead of duplicating it.

Notifier owners (no production call site yet — no email is sent today):

| Template                                                                                   | Notifier                                       |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| 1 downgrade, 2 failed-renewal, 3 grace-expired, 10 cancellation, 11 cancellation-immediate | `TemplateSubscriptionNotifier`                 |
| 4 renewal-7d, 5 renewal-1d                                                                 | `TemplateSubscriptionNotifier.renewalUpcoming` |
| 6 verify-email, 9 welcome                                                                  | `TemplateAccountNotifier`                      |
| 7 receipt                                                                                  | `TemplatePaymentNotifier.paymentReceipt`       |

### Blocked: template 8 (invoice-cfdi)

`renderEmail("invoice-cfdi", ...)` works and is covered by the renderer tests, but no
notifier exposes it yet. A CFDI is a fiscal document, not just an email: the message
only announces that the CFDI is ready and links to `downloadUrl`. Sending it requires
decisions and infrastructure that do not exist in the codebase:

1. Fiscal data on `accounts` (RFC, legal name, tax regime).
2. A PAC integration (Proveedor Autorizado de Certificación) that stamps the CFDI.
3. Storage for the resulting PDF/XML, since `downloadUrl` must resolve to it.
4. A product decision on who issues the invoice and when (per charge, on request, or
   both).

Until those exist, adding a `PaymentNotifier.invoiceIssued` method would codify an API
for a flow that is still undefined. Keep the template rendered and tested, and wire it
in the same commit that introduces the fiscal flow.
