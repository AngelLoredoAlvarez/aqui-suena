# Feature: CFDI cancellation with substitution (motive 01)

Objective: support cancelling an issued CFDI with SAT motive `01` by stamping a
substitute CFDI first and then cancelling the original with the substitute UUID
as `uuidReplacement`. Branch `feat/cfdi-substitution`; one pull request; runner
`pnpm --filter @aqui-suena/api test`.

## Decisions

- **The substitute is a normal issued invoice.** It is a second `cfdi_invoices`
  row for the same `paymentId`, with its own UUID, provider id, archives and
  issued-invoice email. No new status or table.
- **The relation lives in the CFDI, not only in our database.** The Facturama
  payload carries `Relations: { Type: "04", Cfdis: [{ Uuid }] }`; the archived XML
  is the fiscal proof of the relation.
- **The substituted UUID is persisted on the original.** `cfdi_invoices.substitution_uuid`
  records which CFDI replaced the cancelled one, so a retry after a crash reuses it
  instead of stamping a second substitute.
- **Claim before stamping.** The compare-and-set to `cancellation_pending` runs
  before the substitute is issued, so concurrent requests cannot emit two CFDIs.
- **A failed substitute restores the original.** Nothing was sent to cancellation,
  so the row returns to `issued` with the reason recorded.
- **Motive 01 needs the current fiscal profile.** The substitute is stamped with the
  fiscal data the account has now, which is the point of the correction.

## Specs

- **S1 — The substitute is stamped first.** For motive `01`, a new CFDI for the
  same payment is issued and stamped before the original is sent to cancellation.
- **S2 — Related CFDI in the payload.** A substitute carries
  `Relations: { Type: "04", Cfdis: [{ Uuid: <original uuid> }] }`; a regular
  invoice carries no `Relations` key.
- **S3 — The cancellation carries the replacement UUID.** The PAC receives motive
  `01` and `uuidReplacement=<substitute uuid>`. Motives `02` and `03` never send it.
- **S4 — The substitution survives a retry.** The substitute UUID is written to the
  original row before the cancellation request. A later motive `01` request reuses
  it and does not stamp another substitute.
- **S5 — A failed substitute leaves the original valid.** Any failure while
  stamping (provider rejection, missing payment, missing fiscal profile) returns
  the original to `issued` with the reason recorded, and the PAC is never asked to
  cancel it.
- **S6 — The substitute is an issued invoice in history.** It is listed like any
  other invoice, linked to the same payment, with its XML/PDF archived and the
  issued-invoice email delivered.
- **S7 — The claim is atomic in D1.** `markCancellationRequested` updates only a
  row whose status is `issued`, so a second request cannot claim a row already
  in progress.
- **S8 — The client contract stays additive.** `billing.invoices.cancel` keeps
  `{ id, motive }`; the invoice summary also exposes `substitutionUuid`.

Out of scope: receiver-side acceptance handling, refunds, UI, automatic
substitution from the cron, and retrying a rejected cancellation.

## Tasks

- **T1** — Migration `0011`, schema and the `substitutionUuid` field; D1 mapping,
  insert and update. DONE 2026-11-19.
- **T2** — `Relations` in the Facturama payload for a substitute. DONE 2026-11-19.
- **T3** — `IssueInvoice` accepts a specific payment and a substituted UUID.
  DONE 2026-11-19.
- **T4** — `CancelInvoice` motive `01`: stamp, persist, reuse, restore on failure.
  DONE 2026-11-19.
- **T5** — D1 compare-and-set guard on `status = 'issued'`. DONE 2026-11-19.
- **T6** — Router summary field and composition wiring. DONE 2026-11-19.
- **T7** — Docs: specs, backlog and the cancellation feature log. DONE 2026-11-19.

## Log

- L1 — Objective: close the motive `01` gap left by the cancellation phase 1
  (substitute CFDI with relation `04`, then cancel the original). No commits
  until explicitly requested.

## Verification

- `pnpm --filter @aqui-suena/api test` — 1171 tests, 132 files, green.
- `pnpm --filter @aqui-suena/db test` — 18 tests, green.
- `typecheck` — 7/7 tasks, green.
- `biome check` — clean.
- `pnpm arch` — 426 modules, no violations.
- Migration `0011` exercised on `node:sqlite`: the column is added to an existing
  `cfdi_invoices` table and legacy rows read back as `null`.

## Log

- L1 — Objective: close the motive `01` gap left by the cancellation phase 1
  (substitute CFDI with relation `04`, then cancel the original). No commits
  until explicitly requested.
- L2 — The substitute is a second `cfdi_invoices` row for the same payment, not a
  new kind of document: it is stamped, archived and emailed like any issued
  invoice. `substitution_uuid` on the original is the only new state.
- L3 — The claim runs before stamping so two requests cannot emit two CFDIs. A
  failure while stamping restores the original to `issued` with the reason in
  `cancellation_detail`, because nothing reached the PAC and the invoice is still
  valid.
- L4 — The D1 claim was missing `AND status = 'issued'`; the in-memory repository
  already had that guard. Fixed and pinned with a test, because motive `01`
  depends on the compare-and-set to avoid double stamping.
- L5 — Known residual risk: if the PAC stamps the substitute but the response is
  lost (network failure, worker crash), the UUID cannot be recorded and a retry
  stamps another substitute. Facturama offers no idempotency key for issuing, so
  the flow accepts it rather than inventing one; the log keeps it visible.
