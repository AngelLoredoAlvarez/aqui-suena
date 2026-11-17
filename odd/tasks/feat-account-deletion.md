# Feature: account deletion (anonymize + purge)

Objective: let an owner erase their account from the portal, deleting what is
personal and keeping only the financial records the law requires. Branch
`feat/account-deletion`; single pull request; runner
`pnpm --filter @aqui-suena/api test`. Teaching mode: the user types the
implementation, the agent explains and hands exact code. Commits only on
explicit instruction.

## Decisions taken

- **Shape: anonymize + purge**, not a hard delete. `accounts` is referenced by
  `businesses`, `media`, `subscriptions` and `cfdi_invoices`, all with
  `ON DELETE no action`; `payments` hangs off `subscriptions`. Issued CFDI
  invoices and their payments are kept for fiscal retention (stated in
  `SPEC-memberships`), so the account row survives as a tombstone.
- **Businesses: hard delete, immediately.** The 90-day retention exists for a
  billing lapse, not for an erasure request; name, phone, address and contact
  email are personal data the owner asked to remove.
- **Trigger: the owner only**, through an authenticated procedure scoped to
  `ctx.user.accountId`. No admin path in this slice.
- **Order: the Supabase user goes first.** If the purge fails afterwards, the
  person cannot sign in and support can retry. The reverse order would let them
  sign in to an anonymized row, and the provisioning step would write their real
  email back onto the tombstone.

## Specs

- **S1 — Owner-scoped and idempotent.** Only the caller's own account can be
  deleted. A second call on an already-deleted account succeeds and changes
  nothing.
- **S2 — The login dies first.** The Supabase user is deleted before any purge
  work. When the deployment cannot delete users (no secret key configured), the
  request fails with `PRECONDITION_FAILED` and nothing is anonymized.
- **S3 — Media goes, objects too.** Every `media` row of the account is deleted
  and its R2 object removed; a failure leaves the row in place so a retry can
  finish the job.
- **S4 — Businesses go immediately.** Every business of the account is deleted
  with its directory children through the existing cascade.
- **S5 — Financial records stay.** `subscriptions`, `payments` and
  `cfdi_invoices` are never deleted, and their rows keep pointing at the account.
- **S6 — The account becomes a tombstone.** `email` is replaced by a value that
  cannot collide and is not personal (`deleted-<id>@deleted.invalid`), the fiscal
  columns are cleared, and `deleted_at` records the moment.
- **S7 — The email is freed.** After deletion, a new sign-up with the same email
  provisions a brand-new account instead of hitting a conflict. This is the
  behaviour that today has no remedy.
- **S8 — No mail to the dead.** Renewal reminders and any scheduled sender skip
  accounts with `deleted_at` set.
- **S9 — Resumable.** A purge interrupted after the login was removed can be
  retried and finishes the remaining steps without duplicating work.

Out of scope: an admin-driven deletion, a grace window or undo, revoking active
sessions beyond deleting the user, deleting audit logs, and any UI.

## Tasks

- T1 — Tombstone in the repository: `anonymize` on the port, in-memory and D1,
  plus the `deleted_at` migration. Done. S6.
- T2 — Bulk owner deletes: businesses by account; media reuses `listByOwner` +
  `delete` so the R2 key is always available. Done. S3, S4.
- T3 — The login port: `UserDirectory` + Supabase adapter with the secret key;
  a 404 counts as deleted so a retried purge can finish. Done. S2.
- T4 — The use case: login first, then media (object before row), then
  businesses, then anonymize; idempotent. Done. S1–S6.
- T5 — The tRPC procedure: owner scoped with no input id, and
  `PRECONDITION_FAILED` when the deployment cannot delete users. Done. S1.
- T6 — Real-SQLite proof: businesses and products gone, media rows and R2 keys
  removed, invoices and payments intact, account anonymized, and a new sign-up
  with the freed email provisions a second row. Done. S5, S7.
- T7 — Scheduled senders skip tombstones. **Deferred**: no Worker `scheduled`
  handler exists and `RenewalReminderService` has no production caller, so the
  guard would cover a branch nothing executes. The rule is recorded in the
  backlog where the cron will be built.

## Log

- L1 — Authorization to implement account deletion with the anonymize + purge
  shape, owner-triggered, businesses deleted immediately.
- L2 — Evidence: all four foreign keys into `accounts` are `ON DELETE no
  action`, so a hard delete is blocked today; a Supabase user deleted outside the
  system leaves orphan rows and keeps the email taken, and re-signup then hits
  `AccountEmailConflictError`.
- L3 — Brand-new branch cut from `main` after PR #48.
- L4 — The `deleted_at` column can be absent from a partially shaped row; the
  mapper treats `null` and absent the same, otherwise `fromEpoch(undefined)`
  yields an Invalid Date that leaks into `toEqual` comparisons.
- L5 — Verification: api 104 files / 863 tests, typecheck, `pnpm arch`, biome
  and the migration drift check all green; the migration `0003` is generated,
  not hand-written, so `db:generate` reports nothing to migrate.
