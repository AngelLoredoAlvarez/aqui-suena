# Feature: invoice history and downloads

Objective: an owner can list the CFDIs on their account and download each one's
PDF and XML whenever they want, without depending on the email or on a link that
expires. Branch `feat/invoice-history`; delivery through one pull request; runner
`pnpm --filter @aqui-suena/api test`.

## Decisions

- **Authorization by session, delivery by R2.** A protected tRPC procedure decides
  who may download and returns a short-lived presigned URL; the bytes never pass
  through the Worker. Rejected alternatives: a long-lived presigned link (anyone
  holding it reads the document) and a streaming endpoint (would duplicate the
  Supabase auth seam outside tRPC for 55 KB responses).
- **5 minutes** of validity, the expiry the signing helper already uses.
- **Only `issued` invoices** are listed. `failed` rows are PAC rejections, not
  documents the owner recognises as theirs.
- The download URL **carries the filename** through a signed
  `response-content-disposition`.

## Specs

- **S1 — The list is the owner's, newest first.** `billing.invoices.list` takes
  offset pagination (`limit`, `offset`; default limit 20) and returns only rows of
  the authenticated account with `status = issued`, ordered by `created_at`
  descending. A tombstoned account cannot authenticate, so it sees nothing.
- **S2 — A list item carries only what exists.** `id`, `uuid`, `issuedAt`,
  `hasXml` and `hasPdf`. No amount or plan: `cfdi_invoices` stores neither (it
  keeps `payment_id` null until a payment provider exists).
- **S3 — The download is authorised per invoice.** `billing.invoices.downloadUrl`
  takes `{ id, format }` with `format` one of `pdf` | `xml`. A missing or foreign
  invoice answers `NOT_FOUND`, exactly like the rest of the owner surface.
- **S4 — A missing file is not a missing invoice.** When the requested key is
  null (the archive failed at issue time) the procedure answers `CONFLICT` with a
  message naming the format, never a `500` and never a URL to nothing.
- **S5 — The link is short and named.** The signed URL expires in 300 seconds and
  carries `response-content-disposition=attachment; filename="CFDI-<uuid>.<ext>"`
  plus the matching content type, so R2 serves it as a download with the right
  name even when opened directly.
- **S6 — The Worker never proxies the bytes.** It signs and returns; the client
  fetches from R2. No object content enters a Worker response or a log.
- **S7 — Nothing leaks into logs.** Neither the signed URL nor the object key is
  logged; the request log line keeps the request id, path and duration only.

Out of scope: the portal UI that consumes these procedures, download auditing,
revocable links, a backfill for invoices whose archive failed, and CFDI
cancellation.

## Tasks

- **T1** — `presignR2ObjectUrl` accepts expiry and response overrides, keeping the
  300 s default for existing callers (S5).
- **T2** — the CFDI document store signs GET URLs for an archived key (S5, S6).
- **T3** — `CfdiInvoiceRepository.listByAccount` and `getByIdForAccount`, in
  memory and D1 (S1, S3).
- **T4** — `billing.invoices.list` and `.downloadUrl`, wired through composition
  (S1-S4, S6).
- **T5** — Docs: backlog item closed, README and the API README state the
  surface.

## Verification

- `pnpm --filter @aqui-suena/api test` — 918 tests, 113 files, green.
- `typecheck`, `biome check`, `pnpm arch` — clean.
- Not exercised on staging yet: the procedures are covered by router tests with
  an in-memory repository and a fake signer. A staging probe should request one
  URL and fetch it to prove R2 honours the signed filename.

## Log

- **L1** — Scope and the four decisions recorded above: option C, 5 minutes,
  `issued` only, filename in the signature.
- **L2** — `cfdi_invoices` has no amount or plan column; the list therefore
  reports keys, not money. Adding amounts would need a join to `payments` or a
  snapshot column, which the payment provider slice will bring.
