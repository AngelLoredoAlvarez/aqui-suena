# feat-billing-fiscal-profile

Objective: store the fiscal data a CFDI 4.0 receptor needs on `accounts`, validated
and exposed through a protected tRPC surface, so a later PAC integration (Facturama
sandbox first) can issue invoices without reworking the model. Branch
`feat/billing-fiscal-profile`. Delivery: one PR (ask-on-risk). Test runner: vitest.

## Specs

- **S1** — `accounts` stores an optional fiscal profile: `rfc`, `legal_name`,
  `tax_regime`, `tax_zip_code`, `cfdi_use`, `billing_email`, `tax_data_updated_at`.
  Every column is nullable, so an account with no fiscal data keeps working and no
  existing row is rewritten.
- **S2** — RFC is trimmed and uppercased, then validated against the SAT shape:
  12 characters (persona moral) or 13 (persona física), three or four letters
  (including `Ñ` and `&`), six digits and a three-character homoclave. The date
  encoded in positions 5–10 must be a real calendar date.
- **S3** — `taxRegime` accepts only keys from the SAT `c_RegimenFiscal` catalog;
  `cfdiUse` only keys from `c_UsoCFDI`; `taxZipCode` is exactly five digits;
  `billingEmail` is a valid email address (max 254); `legalName` is trimmed,
  uppercased, 1–254 characters and must not carry a régimen societario suffix
  (`S.A. DE C.V.`, `S. DE R.L.`, and equivalents), as the CFDI receptor requires.
- **S4** — `billing.getFiscalProfile` returns the authenticated account's profile or
  `null`; `billing.updateFiscalProfile` validates, persists and returns the
  normalized profile. Both are protected procedures.
- **S5** — Invalid input answers `BAD_REQUEST` through the shared domain error
  mapping; an unauthenticated call answers `UNAUTHORIZED`.
- **S6** — A D1 row whose stored `tax_regime` or `cfdi_use` is not in the catalog
  raises `DataIntegrityError` instead of flowing into the domain, matching the
  persisted-enum rule already used for plans and payments.
- **S7** — The migration is additive (`ALTER TABLE accounts ADD COLUMN …`), applied
  to both D1 databases (`aqui-suena-db-staging`, `aqui-suena-db`) with the
  documented pre-flight; no table rebuild, no data loss.
- **S8** — Fiscal data is only **requested** from accounts with paid time, resolved
  through `resolvePlan` over the active subscription (never `accounts.plan_id`, so a
  cancelled subscription keeps invoicing until its period ends and grace still
  invoices). Storing the profile stays open to any authenticated account, because
  the checkout form collects it before the payment exists and saving emits nothing.
  Issuing a CFDI is the paywalled action and answers `UPGRADE_REQUIRED` for a
  Comunidad account. A downgrade stops the request but keeps the profile and the
  issued invoices.

Out of scope for this slice: issuing CFDIs, the Facturama adapter, the `invoices`
table shape, fiscal data verification against SAT, and any UI.

## Tasks

- [x] T1 (S1, S7) — add the columns to `packages/db/src/schema.ts` and write the
      `ALTER TABLE` statements for both databases.
- [x] T2 (S2, S3) — fiscal profile types and valibot validation in
      `packages/api/src/domain/billing/fiscal/fiscal-profile.ts`, with RED tests.
- [x] T3 (S1, S4, S6) — `AccountRepository.getFiscalProfile` /
      `.updateFiscalProfile` in the in-memory and D1 adapters, with tests.
- [x] T4 (S4, S5) — `billing` tRPC router, wired in `createAppRouter`, with tests.
- [x] T5 — update `docs/specs/SPEC-memberships.md` (CFDI section) and the backlog.
- [x] T6 (S7) — apply the migration to staging and production D1 and verify the
      columns exist with no row changes. DONE 2026-11-16.
- [x] T7 (S8) — document the request/issuance split and pin it with a test that a
      Comunidad account can still store its profile.

## Log

- L3 (2026-11-16): T1-T5 and T7 merged in this branch (commits a6085a3, cf9741f).
  T6 stays open on purpose: neither D1 database has been migrated yet, so no deploy
  may happen before the ALTERs run.

- L1 (2026-11-16): Requested the fiscal-data slice plus a Facturama sandbox
  integration, starting with the data model. This document covers the data model
  only; the PAC adapter is the next slice.
- L2 (2026-11-16): Facturama sandbox chosen for the later integration because it is
  free, does not expire and does not consume folios in sandbox; SW Sapien is the
  fallback. Recorded here so the adapter slice does not re-litigate the choice.

- L4 (2026-11-16): Migration applied to both databases from `packages/api`.
  Pre-flight bookmarks: staging `0000001f-00000000-00005125-9a3a6e828eadda241767b8e1d8129a03`,
  production `00000001-00000002-00005125-aed108d3ed85184defaa06b42255f84b`.
  Row counts stayed identical (staging 3 stations / 3 plans / 0 accounts,
  production all zero). `pragma_table_info('accounts')` reports the seven new
  columns in both. Post-migration bookmarks: staging
  `0000001f-00000006-00005125-cd1507eeba25c96409a6990e3ddd7dd2`, production
  `00000001-00000008-00005125-2b802ebe6c11aae670a05603598ec014`.
  The `DROP TABLE invoices` from the follow-up branch also ran on both databases
  (15 → 14 tables), with the same bookmarks capturing it.
