# Feature: account provisioning (lazy + email sync)

Objective: every authenticated session gets its `accounts` row on first contact,
so any owned resource can satisfy its foreign key. Branch
`feat/account-provisioning`; delivery through a single pull request; runner
`pnpm --filter @aqui-suena/api test`. Teaching mode: the implementation is typed
by the user, the agent explains and hands exact code. Commits only on explicit
instruction.

## Specs

- **S1 — Provision on first authenticated request.** A request carrying a valid
  Supabase session ensures one `accounts` row exists. `id` is the same value
  `ctx.user.accountId` resolves to; `email` is the session email, trimmed and
  lowercased; `plan_id` and `locale` keep their database defaults (`community`,
  `es-MX`). No business, subscription or listing is created.
- **S2 — Idempotent.** A second request for the same id performs no write: no
  duplicate row, no error, no timestamp refresh.
- **S3 — Concurrent first requests.** Two requests racing on the same brand-new
  id leave exactly one row and neither fails.
- **S4 — Email sync.** When the session email differs from the stored
  `accounts.email`, the stored value is updated once. Nothing else changes:
  `plan_id`, `locale`, `billing_email` and the fiscal columns are never touched.
- **S5 — No email, no account.** A session without an email address creates
  nothing and fails with a clear server error naming the cause.
- **S6 — No adoption.** An email already stored against a different account id
  is not reassigned: the request fails with a logged error naming both ids.
- **S7 — Owned writes work immediately.** A brand-new session can create an
  owned resource (the `accounts(id)` foreign key is satisfied) without any
  manual row.

Out of scope: account deletion and cascade, signup UI, plan selection,
onboarding emails, and re-fetching the email from the Supabase admin API for
scheduled jobs.

## Open point

`SPEC-owner-portal` requires signup to collect birthdate, T&C acceptance and an
18+ attestation, with a server-side `create-account` that rejects an underage
signup "without creating the account". A lazily provisioned `accounts` row is
only the foreign-key anchor for owned data; the age and consent fields live
outside this slice and will be written by that flow. Revisit when `create-account`
is specified: if "no account" must also mean no `accounts` row, provisioning has
to move behind that step.

## Tasks

- T1 — `AccountRepository.ensure` in the in-memory repository: create,
  idempotent, email sync. Route: inline (teaching). S1, S2, S4. Done: four tests
  green (defaults, normalization, sync, nothing-else-changes).
- T2 — `D1AccountRepository.ensure`: `INSERT ... ON CONFLICT(id) DO NOTHING`
  plus a conditional update only when the email differs; epoch timestamps; test
  asserts the statements and their parameters. S1–S4. Done: one read and zero
  writes when the row exists; the insert names no default column.
- T3 — provisioning in `createContext`: tolerant of no header and invalid
  tokens, error on a missing email, propagates repository failures. S1, S5. Done.
  The session email is not carried on `User`: nothing reads it, and adding it
  would rewrite 52 test context literals.
- T4 — Wiring in `app.ts`. S1. Done: `worker.ts` and the local Node entry point
  both go through `createApp`, so no other call site needed touching.
- T5 — Concurrency, no-adoption and the foreign key against real SQLite. S3, S6,
  S7. Done: `d1-account-provisioning.test.ts` runs the real schema on
  `node:sqlite`; two racing first requests leave one row, an email owned by
  another id raises `AccountEmailConflictError` with the owner id, and an owned
  `media` insert passes the foreign key right after provisioning.
- T6 — Docs: close the backlog item, record provisioning in
  `SPEC-owner-portal`. Done.
- T7 — Staging verification: a fresh session with no `accounts` row must persist
  an owned resource without manual inserts. Pending.

## Log

- L1 — Authorization to implement lazy account provisioning with email re-sync,
  in teaching mode.
- L2 — Backlog evidence: staging `media.confirm` answered `INTERNAL_SERVER_ERROR`
  with `D1_ERROR: FOREIGN KEY constraint failed` until an `accounts` row was
  inserted by hand for the test user; no writer for `accounts` exists in
  `packages/api`.
- L3 — Design decision: provisioning runs in `createContext`, not in a tRPC
  middleware. Reason: the 68 `createCaller` call sites build a context literal;
  adding the repository to `Context` would rewrite all of them, and an optional
  field would let tests silently skip provisioning. `createContext` already owns
  authentication and is directly testable with a mocked Supabase client.
- L4 — Cost accepted: one `accounts` read per authenticated request and one
  write per account lifetime (plus one write when the email changes). D1 free
  tier allows 5M reads/day.
- L5 — The conflict is detected by catching the `UNIQUE` failure instead of a
  pre-flight `SELECT`: the happy path stays at one read, and the constraint
  remains the guarantee. Classification matches `UNIQUE constraint failed:
  accounts.email`, the text both D1 and `node:sqlite` emit; the SQLite test
  proves it. Any other error is rethrown untouched.
- L6 — Verification: `pnpm --filter @aqui-suena/api test` (99 files, 847 tests),
  `pnpm typecheck`, `pnpm exec biome check packages/api/src` all green.
- L7 — Review of the slice found two defects in the first implementation. (1) The
  in-memory `ensure` looked up the email owner before checking whether the row
  already existed, so a second call for the same account threw a conflict
  against itself; no test covered that case, which is why it slipped through.
  Fixed by checking existence first, with a regression test. (2) The D1 update
  path had no conflict handling, so a changed session email that another account
  already owned surfaced as a raw constraint error; it now raises
  `AccountEmailConflictError` too, covered by a real-SQLite test. Also dropped
  the unused `email` field from the error, merged duplicate imports and removed
  an unrelated blank line. The two remaining comments (email canonicalization
  and the constraint-text classifier) state why, not what, so they stay.
