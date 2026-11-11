# fix-paid-time-chaining

Status: **done.** Implemented 2026-11-11 on branch `fix/paid-time-chaining` with strict RED→GREEN TDD.

Objective: stop the platform from discarding paid time. A new billing period must start where the paid period ends, never at `now` while paid time remains. Branch to create: `fix/paid-time-chaining`.

Delivery strategy: `single-pr`, two commits (one per rule).
Test runner: `pnpm --filter @aqui-suena/api test`.

## Specs

- **S1 — `changePlan` works during an already-paid cancellation, and an upgrade chains the period.** `SubscriptionService.changePlan` currently rejects any status other than `active` (`subscription-service.ts:89`), so an account that cancelled but still has `endsAt` in the future keeps its entitlements through `resolvePlan` yet cannot change plans. It must accept `cancelled` while `endsAt > now`. A **downgrade** keeps today's shape: the current subscription is marked `cancelled` and the new period starts at `current.endsAt`. An **upgrade** takes effect immediately (`startedAt = now`, current marked `expired`) and its `endsAt` is `addMonths(current.endsAt, 1)` when paid time remains, instead of `addMonths(now, 1)`. At `now === endsAt` the paid period is over: the call is rejected as before, matching `resolvePlan`'s exclusive `endsAt` boundary.
- **S2 — Re-subscribing resumes instead of resetting.** `SubscriptionService.subscribe` (`subscription-service.ts:54`) cancels active subscriptions and then creates a period from the caller's dates; with `startedAt = now` the remaining paid days on a cancelled subscription become unreachable because `getActive` prefers the new `active` row. When the account has a `cancelled` subscription for the **same plan** with `endsAt > now`, `subscribe` must reactivate it (`status = active`) and set `endsAt = addMonths(endsAt, 1)` rather than creating a second row. When the plan differs, the call follows the `changePlan` rule above. With no paid time left, behavior is unchanged: a new period starts at `now`.
- **S3 — No money is prorated and no unused time is refunded.** `SPEC-memberships.md` forbids prorating charges and partial refunds in V1; chaining time is neither. The only observable effect is that paid days keep their value in time, not in money.
- **Out of scope:** `cancel` staying non-idempotent (a second cancel still answers `ConflictError`); `failRenewal` writing `grace` and `graceEnd` in two statements; any billing UI disclosure of the upgrade chaining rule.

## Tasks

- T1 / S1 — relax the `changePlan` guard to accept a `cancelled` subscription with paid time and chain `endsAt` on upgrade. DONE — RED: "upgrades a cancelled subscription that still has paid time" failed with `ConflictError: Subscription is not active`; GREEN after the guard accepts `cancelled` while `endsAt > now` and the upgrade chains from `paidUntil` (`2026-02-01 + 1 month = 2026-03-01`, not `2026-02-15`). Boundary guards added: reject past-period and at-exact-end.
- T2 / S2 — make `subscribe` resume a same-plan cancelled subscription. DONE — RED: "reactivates a cancelled same-plan subscription instead of creating a second one" failed on a new id (second row); GREEN after `subscribe` finds the cancelled same-plan sub, extends `endsAt` by one period and reactivates it (exactly one row, `endsAt = 2026-03-01`).
- T3 / S1-S2 — docs already updated (`SPEC-memberships.md`, "Paid time is never lost"); close this tracker with RED/GREEN evidence. DONE.

## Tests to write first (RED)

All four live in `packages/api/src/domain/billing/subscriptions/subscription-service.test.ts`. The first two are the current slice's RED; the last two are guards that must already pass.

1. `upgrades a cancelled subscription that still has paid time` — community cancelled with `endsAt` 2026-02-01, upgrade to trades at `now` 2026-01-15: new subscription is `active`, `startedAt` is 2026-01-15, and **`endsAt` is 2026-03-01** (chained from the old end), not 2026-02-15.
2. `reactivates a cancelled same-plan subscription instead of creating a second one` — commerce cancelled with `endsAt` 2026-02-01, `subscribe` the same plan at 2026-01-15: exactly one commerce row for the account, its status is `active`, and `endsAt` is 2026-03-01.
3. `rejects changing plan when the cancellation already passed its paid period` — `now` 2026-02-02 → `ConflictError`.
4. `rejects changing plan at exactly the end of the paid period` — `now` 2026-02-01 → `ConflictError`.

`startedAt` fixtures must be set explicitly. `InMemorySubscriptionRepository.create` defaults nothing, but `makeSubscription`-style helpers defaulting to `Date.now()` produced two false greens during the previous slice: a fixed `now` earlier than the default `startedAt` short-circuits on the `startedAt > now` guard.

## Log

### L3 — 2026-11-11 — implemented with strict TDD

- T1 (`changePlan`): relaxed the guard to accept `cancelled` while `endsAt > now` and changed the upgrade path to chain `endsAt` from `paidUntil` instead of `now`. Because the rule covers `active` too, the existing "upgrades at month-end" test was updated to pin the chained + clamped result (`addMonths(2026-01-31, 1) = 2026-02-28`).
- T2 (`subscribe`): resume a same-plan cancelled subscription with paid time left — reactivate and extend `endsAt` by one period — instead of creating a second row. The service re-reads via `getById` after mutating so the D1 repository (which re-reads from the DB) returns fresh state, not the stale `listByAccount` snapshot.
- Biome: the recommended preset forbids non-null assertions, so the paid-time condition carries the value (`paidUntil: Date | null`) and uses `??` instead of a boolean + `!`.
- Verification: `tsc --noEmit` clean, full suite 663 tests green (77 files), `biome check` clean on the changed files.

### L2 — 2026-11-10 — decision recorded, no code yet

- The rule was agreed after the user rejected an earlier proposal that let an upgrade during a paid cancellation forfeit the remaining days. That proposal is void; the rule is chaining.
- Documentation: `SPEC-memberships.md` gained the "Paid time is never lost" success criterion.
- Two existing gaps were re-confirmed and stay in `odd/tasks/backlog.md` under _Billing follow-ups_: `cancel`/`changePlan` requiring `active` (this tracker fixes the `changePlan` half), and `failRenewal`'s two-statement write.
- On resume: read this file, then `SubscriptionService.changePlan`/`subscribe`, then run the baseline before writing any test.

### L1 — 2026-11-10 — request summary (paraphrased, not verbatim)

The user confirmed that a client must be able to cancel at any time and come back at any time without friction, and rejected the idea that the days already paid during a cancellation are lost, because the client would perceive it as theft. They asked for the agreed rule to be recorded so the work can resume in another session.
