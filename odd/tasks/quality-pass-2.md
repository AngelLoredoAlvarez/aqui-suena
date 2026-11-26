# Quality pass 2: remaining TDD, SOLID and structure gaps

Objective: close the remaining findings from the full monorepo re-scan — the
duplicated payment/subscription composition, three untested logic modules, the
monolithic DB schema and two oversized presentational components. Branch
`chore/quality-pass-2`. Delivery: `ask-on-risk`, one slice per task. Test
runner: Vitest (per package), `turbo run typecheck`, `pnpm build`.

## Specs

- S1 — The payment/subscription use-case graph is composed in exactly one
  place. `server/jobs/payment-sweeps.ts` and `server/composition/worker-app.ts`
  both consume the shared factory. Behavior is unchanged; existing tests stay
  green.
- S2 — `PaymentNotifications` (receipt and pending paths) gains a co-located
  test covering: no-op when `accounts`/`notifier` are absent, skip for missing
  or deleted accounts, plan-name fallback, and delivery errors routed to
  `onDeliveryError` without failing the payment.
- S3 — `hideBusinessesOutsideSelection` gains a co-located test covering the
  hidden-id selection and the retention-deadline update.
- S4 — `sendRenderedEmail` gains a direct test covering render + send with and
  without attachments.
- S5 — `packages/db/src/schema.ts` is split by domain into `src/schema/*`
  modules with a re-exporting barrel. The public export surface is unchanged
  and `drizzle.config.ts` points at the new entry.
- S6 — `landing-header.tsx` and `landing-sidebar.tsx` are split into one file
  per subcomponent with no behavior change.

## Tasks

- T1 — S2: test `PaymentNotifications`. Route: inline. ✅ done — `d80d476`
- T2 — S3: test `hideBusinessesOutsideSelection`. Route: inline. ✅ done — `d80d476`
- T3 — S4: test `sendRenderedEmail`. Route: inline. ✅ done — `d80d476`
- T4 — S1: extract the shared payment graph factory and refactor both call
  sites, plus a factory test. Route: inline. ✅ done — `b56167e`
- T5 — S5: split the DB schema by domain. Route: inline. ✅ done — `4d41de4`
- T6 — S6: split `landing-header.tsx`. Route: inline. ✅ done — `4f73a99`
- T7 — S6: split `landing-sidebar.tsx`. Route: inline. ✅ done — `4f73a99`
- T8 — Close: full typecheck, package tests, build, and doc updates. ✅ done

## Log

- L1 — Requirement: apply the remaining TDD/SOLID/Clean Code and structure
  improvements found in the full monorepo re-scan, on a new branch.
  (2026-11-26)
- L2 — T1–T3: added co-located tests for `PaymentNotifications` (13),
  `hideBusinessesOutsideSelection` (3) and `sendRenderedEmail` (3). All pass.
  (2026-11-26)
- L3 — T4: extracted `createPaymentGraph` into
  `server/composition/payments.ts`; both `worker-app.ts` and
  `payment-sweeps.ts` now consume it, removing the duplicated use-case wiring.
  Added a factory test (3). API typecheck clean, 1424 tests pass (+22).
  (2026-11-26)
- L4 — T5: split `packages/db/src/schema.ts` into `src/schema/{radio,accounts,
  plans,billing,directory,media,index}.ts` (acyclic: billing→accounts+plans,
  directory→accounts, media→accounts+directory). Updated `drizzle.config.ts`
  and the `db:generate` script. `drizzle-kit generate` reports no schema change
  and no migration drift; 38 db tests pass. (2026-11-26)
- L5 — T6+T7: split `landing-header.tsx` into `header/{search-pill,
  assistant-button,language-button,icon-button}.tsx` and `landing-sidebar.tsx`
  into `sidebar/{search-pill,filter-chip,business-card}.tsx`. Note: the header
  and sidebar each keep their own `SearchPill` variant (44px vs 48px); merging
  them would change layout and needs design approval. 259 ui tests pass.
  (2026-11-26)
- L6 — T8: full typecheck 8/8, api 1424 / db 38 / ui 259 tests, biome clean,
  `pnpm arch` clean, no migration drift. Updated SPEC-{memberships,
  support-chatbot,business-directory,media-storage,notifications}.md and
  `packages/db/MIGRATIONS.md` to the new `src/schema/` layout. (2026-11-26)
- L7 — Follow-up: reduced duplication in `server/composition/invoices.ts`.
  Extracted `r2StorageOptions` (the R2 config guard + options were repeated in
  four factories) and `describeError` (error formatting repeated in six
  callbacks). Public API unchanged; 1424 api tests and the 12 composition
  tests stay green. (2026-11-26)
