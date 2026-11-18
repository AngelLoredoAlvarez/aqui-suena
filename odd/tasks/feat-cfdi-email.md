# Feature: CFDI delivery by email (PDF + XML attachments)

Objective: a stamped CFDI reaches the account owner by email as a real fiscal
document — the provider PDF and the archived XML travel as attachments, and the
message never depends on a link that can expire. Branch `feat/cfdi-email`;
delivery through a single pull request; runner
`pnpm --filter @aqui-suena/api test`. Teaching mode: the implementation is typed
by the user, the agent explains and hands exact code. Commits only on explicit
instruction.

## Specs

- **S1 — Attachments in the transport port.** `EmailMessage` accepts an optional
  list of attachments, each with `filename` and `content` (base64) and
  `contentType`. A message without attachments serializes exactly as it does
  today, so every existing sender keeps its current request body.
- **S2 — Resend carries attachments.** `ResendEmailSender` forwards the
  attachment list in the Resend request body under `attachments`, each entry as
  `{ filename, content, content_type }`. A message with no attachments adds no
  `attachments` key at all.
- **S3 — The PAC exposes the PDF.** The issuer port gains a PDF download for an
  already-stamped CFDI addressed by provider id. The Facturama adapter asks
  `GET {baseUrl}/3/cfdis/{id}?format=pdf` (API Web) or
  `GET {baseUrl}/api-lite/4/cfdis/{id}?format=pdf` (multiemisor) with the same
  Basic credentials, and returns the raw bytes. A non-2xx answer raises
  `InvoiceProviderRejection` with the provider detail; the detail is never
  returned to the client.
- **S4 — One notifier owns template 8.** A `CfdiNotifier` port receives the owner
  recipient (`email`, `locale`) plus the invoice data. Its template
  implementation renders `invoice-cfdi` with `invoiceId`, `planName`, `issuedAt`,
  `amount` (`formatEmailMoney` in the invoice currency) and `downloadUrl`, which
  the caller supplies because the document travels attached. The attachments are
  named `CFDI-{uuid}.pdf` and `CFDI-{uuid}.xml`.
- **S5 — The XML attachment is the archived one.** The XML sent is exactly the
  content that passed through the archive step, taken from memory; no second
  provider round trip fetches it and no R2 read retrieves it.
- **S6 — A stamped invoice is always recorded.** Issuing is not transactional
  with the email: a failed render, send or PDF download never fails
  `billing.requestInvoice` and never rolls back the `cfdi_invoices` row. The
  failure is logged with the invoice id.
- **S7 — PDF unavailable, XML still delivered.** When the PDF download fails,
  the email is sent with the XML only, and the failure is logged. A missing PDF
  is never a reason to withhold the legal document.
- **S8 — Deleted accounts receive nothing.** When the account row has
  `deleted_at` set, no email is sent. Financial rows are retained for fiscal
  retention; mail is not.
- **S9 — Unconfigured email is a no-op.** When no email sender is configured,
  invoicing still works and nothing is attempted; the same shape `subscriptions.
  cancel` uses today.
- **S10 — The template body is untouched.** Template 8's copy and layout are
  delivered as designed; only the variables and attachments are supplied by this
  slice.
- **S11 — The PDF is archived beside the XML.** When the PDF download succeeds,
  the Worker stores it in R2 and records `cfdi_invoices.pdf_key` in the same
  insert that carries `xml_key`. The column is nullable: a failed download or a
  failed archive leaves it `null`, never fails the request and never blocks the
  email, which then carries the XML only. Existing rows keep `pdf_key` null and
  are not backfilled by this slice.

Out of scope: the invoice history read model (`listByAccount`, `getById`), the
owner-portal download surface (presigned URL versus authenticated endpoint),
backfilling `pdf_key` for invoices already stamped, the cancellation slice
(`issued → cancellation_pending → ...`), recovering a missing `xmlKey` by
`providerId`, and the renewal-reminder cron.

## Tasks

- **T1** — Email attachment port + Resend serialization (S1, S2). Route: inline.
  DONE.
- **T2** — PAC PDF download port + Facturama adapter (S3). Route: inline. DONE.
- **T3** — PDF archive: `savePdf` on the store, `pdf_key` column, migration
  `0004`, repository insert (S11). Route: inline. Risk: item 1 (migration). DONE.
- **T4** — `CfdiNotifier` port + `TemplateCfdiNotifier` (S4, S5, S10). Route:
  inline. DONE.
- **T5** — Call site delivery in `IssueInvoice` + composition and Worker wiring
  (S6, S7, S8, S9, S11). Route: inline. DONE.
- **T6** — Docs: `odd/tasks/backlog.md`,
  `packages/api/design/email-templates/TEMPLATES.md`. Route: inline. DONE.

## Verification

- `pnpm --filter @aqui-suena/api test` — 894 tests, 107 files, green.
- `pnpm --filter @aqui-suena/api typecheck` and `pnpm --filter @aqui-suena/db
  typecheck` — clean.
- `biome check packages/api/src packages/db/src` — no findings.
- `pnpm arch` — 370 modules, no violations.
- `node scripts/check-singletons.mjs` — 13 singletons, one physical copy each.

Not verified yet: nothing runs against staging. Migration `0004` and the delivery
path both need a staging deploy plus a real invoice request to be proven end to end.

## Log

- **L1** — Slice authorized after reviewing the open backlog. Decision recorded
  for the delivery strategy: attachments rather than a link, so the fiscal
  document arrives complete and no signed URL can expire. The email CTA points
  at the billing page.
- **L2** — Evidence gathered before planning: `billing.requestInvoice` calls
  `IssueInvoice.execute`; `renderEmail` for `invoice-cfdi` expects `downloadUrl`
  (CTA), `billingUrl` (secondary), `invoiceId`, `issuedAt`, `amount`;
  `R2CfdiXmlStore` keeps the XML in a private bucket (no clickable URL without
  signing); the Facturama adapter only implements `issue()`; `EmailMessage` has
  no attachment field; `subscriptions.cancel` is the existing pattern for a
  notifier at a router call site (account email + locale, optional notifier).
- **L3** — Scope extended: the PDF is archived in R2 next to the XML so a future
  owner-portal download never depends on the PAC being alive or retaining old
  records. The initial estimate of "about ten lines" was wrong: it needs a
  nullable `pdf_key` column (migration `0004`), the schema, the store method and
  the repository insert, which is why it is its own task with risk item 1.
  History and the download surface stay out of this slice because they need a
  new read model and an authentication decision.
- **L4** — T4 evidence: template `t8` interpolates `{planName}` in its preheader
  and first paragraph, so S4 needs it; the renderer throws on a missing
  variable, and `billingUrl` is injected by `createEmailTemplateRenderer` while
  `downloadUrl` is not. Consequence: the notifier receives `downloadUrl` from
  its caller instead of rebuilding the URL, and T5 resolves it from the same
  app URL and billing path the composition already holds.
  Open tension, not changed here: the t8 CTA copy says "Descargar factura" while
  the files already travel attached and the button leads to the billing page.
  Rewording copy is a product decision and stays outside this slice (S10).
- **L5** — T5 delivery lives inside `IssueInvoice`, not in the router: `pdf_key`
  has to be present in the same insert as `xml_key` (S11), so the PDF is
  downloaded and archived before the row is created, and the bytes are reused
  for the attachment instead of fetched twice. `downloadUrl` comes from the
  composition (`EMAIL_BILLING_URL`), not from the notifier, so the domain never
  hardcodes a frontend route. Failures are reported through `onDeliveryError`
  with a `pdf` | `email` stage, and none of them can fail the request.
  Verification: api suite 894 tests green, typecheck, biome, singletons and
  `pnpm arch` (370 modules) clean.
