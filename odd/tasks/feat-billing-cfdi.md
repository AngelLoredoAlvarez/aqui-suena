# feat/billing-cfdi — issue CFDI invoices through Facturama sandbox

Branch `feat/billing-cfdi` from `main@53a054a`. Delivery: work-unit commits on the branch, PR to `main`, nothing pushed without the user's go-ahead. Runner: `pnpm --filter @aqui-suena/api test` (vitest), typecheck via `pnpm -r typecheck`.

## Specs

S1. `billing.requestInvoice` (protected mutation) issues one CFDI for the account's fiscal profile. It answers `{ invoice }` with `{ id, status, uuid, issuedAt }`. Fiscal data is read from the account, never from the request body.

S2. The plan gate resolves the plan with `resolvePlan(await subscriptionRepository.getActive(accountId))`, never `accounts.plan_id`. Comunidad throws `UpgradeRequired`. A cancelled subscription inside its paid period and a subscription in grace still invoice.

S3. The transport maps `UpgradeRequired` to tRPC `FORBIDDEN` with message `UPGRADE_REQUIRED: <hint>` in one place, `mapDomainErrors` in `packages/api/src/server/trpc/trpc.ts`. The duplicated try/catch in `products.ts` and `businesses.ts` is removed; `businesses.ts` must never swallow non-upgrade errors (`FORBIDDEN` today comes from an untyped cast of any error).

S4. Port/adapter split: `InvoiceIssuer` port in `domain/billing/invoices`; `FacturamaInvoiceIssuer` adapter in `infrastructure/billing/facturama` using HTTP Basic auth and `POST /3/cfdis`. The `IssueInvoice` use case owns every rule; the adapter only serializes, sends, and parses.

S5. Provider is the Facturama **sandbox** (free, no expiry, no folios consumed, payload identical to production, test CSD `EKU9003173C9`). Configuration comes from `FACTURAMA_USER`, `FACTURAMA_PASSWORD`, `FACTURAMA_BASE_URL` in `.env.schema` and Infisical. Sandbox CFDIs have no fiscal validity and the code never claims otherwise.

S6. Persistence: a new `cfdi_invoices` table (uuid, status, `payment_id` nullable, xml object key, provider ids, timestamps) instead of extending the dropped `invoices` table. The XML is stored in R2 through the existing `ObjectStorage` port; the row keeps only the key. `payments` gains a `plan_id` snapshot before Conekta exists.

S7. Issuing rules: an incomplete fiscal profile is a `ValidationError` (`BAD_REQUEST`) telling which field is missing; a provider rejection surfaces as a typed failure and persists the attempt with status `failed` and the provider's message, never as `issued`.

S8. Writing fiscal data stays open to any authenticated account (checkout fills it before paying); only issuing requires a paid plan. Downgrading never deletes a stored profile and never touches already issued invoices.

## Tasks

- T1. Centralize the upgrade mapping (S3) — inline, RED first in `trpc.test.ts`.
- T2. `InvoiceIssuer` port + `IssueInvoice` use case with the plan gate and profile validation (S1, S2, S4, S7) — inline, RED first with a fake issuer.
- T3. `FacturamaInvoiceIssuer` adapter with injected `fetch` (S4, S5) — inline, RED first.
- T4. `cfdi_invoices` table, migration, D1 and in-memory repositories (S6) — inline.
- T5. `billing.requestInvoice` procedure, R2 XML storage and router wiring (S1, S6) — inline.
- T6. `payments.plan_id` snapshot (S6) — inline.
- T7. Docs: `SPEC-memberships.md`, `odd/tasks/backlog.md`, `.env.schema`, `packages/api/README.md` (S5, S8) — inline.

Route for every task: inline, teaching mode. The user transcribes the code; the agent hands exact code, target file and line reference, then waits for doubts before moving on.

## Commits

| Task   | Commit                                                                           |
| ------ | -------------------------------------------------------------------------------- |
| T1     | `1c6c937` refactor(api): map UpgradeRequired once in the transport               |
| T2, T3 | `df9e9a0` feat(billing): issue CFDI invoices through Facturama                   |
| T4, T6 | `8db8b35` feat(db): add cfdi_invoices and snapshot the plan on payments          |
| T5     | `49f4a8f` feat(billing): expose billing.requestInvoice                           |
| T7     | `a58a386` docs: document CFDI invoicing and drop user attribution from task logs |

T4 and T6 share one commit because both edit `packages/db/src/schema.ts`; splitting them would have needed hunk staging and left a commit that does not build. The attribution rule itself landed separately in `57ef9e3 docs(agents): forbid user attribution in artifacts`.

## Log

L1 (2026-11-16): Authorized the CFDI slice and asked to run it in teaching mode, working together as in previous slices.

L2 (2026-11-16): Teaching-mode rules recovered from Engram (#479, #574): the user transcribes the code, the agent gives complete well-explained code with target files and line references, strict TDD (RED → GREEN → REFACTOR), Clean Code and SOLID, no commits until explicit go-ahead, artifacts in English, chat in Spanish, one question at a time.

L3 (2026-11-16): Slice decisions carried over from Engram (#586): port/adapter split, Facturama sandbox, `resolvePlan` gate, `UPGRADE_REQUIRED` prefix, `cfdi_invoices` + `payments.plan_id`, fiscal data open to authenticated accounts, sandbox credentials in Infisical.

L4 (2026-11-16): Branch `feat/billing-cfdi` created from `main@53a054a`; working tree clean.

L5 (2026-11-16): Teaching-mode rules extended at the user's request: every step explains why it is done, what it solves, and what the code (functions, types, tools) means, not only the code itself.

L6 (2026-11-16): T1 done (S3). `UpgradeRequired` moved to `shared/domain-error.ts` as a `DomainError`; `mapDomainErrors` owns the FORBIDDEN + `UPGRADE_REQUIRED: <hint>` mapping; the duplicated try/catch was removed from `products.ts` and `businesses.ts`, which also stopped swallowing unrelated errors as 403.

L7 (2026-11-16): T2 assumption (stated, open to change): with no payment provider yet, the CFDI is issued for the current subscription period at `plan.priceMonthly` / `plan.currency`, with `payment_id` null. The concept text is the plan name. When Conekta lands, the issue path takes the paid payment instead.

L8 (2026-11-16): T4 done (S6, table only): `cfdi_invoices` schema, migration `0001_white_northstar.sql`, `D1CfdiInvoiceRepository.create`. The migration is NOT applied to any database yet.

L9 (2026-11-16): T3 done (S4, S5): `toFacturamaCfdiPayload` + `FacturamaInvoiceIssuer` with injected `fetch`; payload shape is an assumption to validate against the sandbox before merge.

L10 (2026-11-16): T5-A done: `presignR2ObjectUrl` helper and `R2CfdiXmlStore`. User-approved policy for a failed XML upload after a successful stamp: persist `issued` with `xmlKey: null`, do not fail the request; the XML is recoverable later via the stored `providerId`. A known cross-context dependency (`billing` importing `infrastructure/media`) is accepted for now and logged as debt: the R2 client should move to `infrastructure/r2/`.

L11 (2026-11-16): T5 done (S1, S4, S6, S8): `billing.requestInvoice` with `PRECONDITION_FAILED` when unconfigured, `createIssueInvoice` composition (all-or-nothing, VAT rate validated as a fraction), `router.ts`/`app.ts`/`worker.ts` wiring, staging `[vars]` and `.env.schema` entries. T6 done (S6): `payments.plan_id` snapshot, `NewPayment` write contract, migration `0002`. T7 docs: `SPEC-memberships.md`, `packages/api/DEPLOY.md` and `odd/tasks/backlog.md` updated.

L12 (2026-11-16): Remaining before the slice closes: apply migrations `0001`/`0002` to staging, upload the Facturama secrets, replace `FACTURAMA_EXPEDITION_PLACE`, deploy, and run one authenticated `billing.requestInvoice` against the sandbox to validate the payload. Every one of those is a remote mutation and waits for an explicit go-ahead.

L13 (2026-11-16): Implementation committed in six work-unit commits (`1c6c937`, `df9e9a0`, `8db8b35`, `49f4a8f`, `57ef9e3`, `a58a386`) on `feat/billing-cfdi`. Each passed the pre-commit gates: gitleaks, lint-staged, singleton guard, typecheck across eight packages and the full suite (97 files, 822 tests). Nothing pushed.

L14 (2026-11-17): Slice closed against the staging sandbox. Migrations 0001/0002 applied to `aqui-suena-db-staging` (bookmark `00000022-00000000-00005126-66a9de4b5b8ffcc01aa66b6c9c0ad57a`); the SAT test CSD `EKU9003173C9` registered in the multiemisor API; staging deployed and one authenticated `billing.requestInvoice` returned `issued` with a fiscal UUID and the XML archived in R2. Two runtime defects surfaced only on the edge: the Facturama adapter and the R2 client both called native `fetch` as a method, which Workers rejects as Illegal invocation; both are fixed, with a regression test on the R2 client. A failed XML archive is now reported through `onArchiveError` instead of vanishing, and `/health/deep` probes R2 access so a present-but-unusable configuration stops reporting `configured`. The test account and its rows were removed from staging afterwards.
