# Templates

| # | slug | subject es-MX | subject en | CTA es-MX -> URL var | secondary link | variables |
|---|---|---|---|---|---|---|
| 1 | downgrade | Tu plan ha sido degradado | Your plan has been downgraded | Gestionar mi suscripción -> billingUrl | - | planName, billingUrl, appUrl, supportEmail |
| 2 | failed-renewal | Tu pago falló — periodo de gracia de 7 días | Your payment failed — 7-day grace period | Actualizar método de pago -> billingUrl | - | graceEnd, billingUrl, appUrl, supportEmail |
| 3 | grace-expired | Tu plan ha sido degradado | Your plan has been downgraded | Ver planes -> billingUrl | - | planName, billingUrl, appUrl, supportEmail |
| 4 | renewal-7d | Tu plan se renueva en 7 días | Your plan renews in 7 days | Gestionar mi suscripción -> billingUrl | - | renewalDate, billingUrl, appUrl, supportEmail |
| 5 | renewal-1d | Tu plan se renueva mañana | Your plan renews tomorrow | Ver mi suscripción -> billingUrl | - | renewalDate, billingUrl, appUrl, supportEmail |
| 6 | verify-email | Verifica tu correo electrónico | Verify your email address | Verificar correo -> verifyUrl | - | expiresIn, verifyUrl, appUrl, billingUrl, supportEmail |
| 7 | receipt | Tu recibo de pago — Aquí Suena | Your payment receipt — Aquí Suena | Ver mi suscripción -> billingUrl | - | amount, planName, period, paidAt, paymentId, billingUrl, appUrl, supportEmail |
| 8 | invoice-cfdi | Tu factura fiscal (CFDI) está lista | Your tax invoice (CFDI) is ready | Descargar factura -> downloadUrl | Ver mi cuenta -> billingUrl | planName, invoiceId, issuedAt, amount, downloadUrl, billingUrl, appUrl, supportEmail |
| 9 | welcome | Bienvenido a Aquí Suena | Welcome to Aquí Suena | Ir a mi panel -> ownerPortalUrl | Ver planes -> billingUrl | businessName, recommendedPlan, ownerPortalUrl, billingUrl, appUrl, supportEmail |
| 10 | cancellation | Tu cancelación ha sido confirmada | Your cancellation has been confirmed | Ver mi suscripción -> billingUrl | Ver planes -> billingUrl | activeUntil, planName, billingUrl, appUrl, supportEmail |
