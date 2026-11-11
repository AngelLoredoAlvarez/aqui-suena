# fix-resolve-plan-grace

Objective: make `resolvePlan` honor the paid time a cancellation still covers and the 7-day failed-renewal grace window, instead of downgrading every non-active subscription to `community`. Branch `fix/resolve-plan-grace-and-cancelled`, TDD, one reviewable commit.

Delivery strategy: `single-pr`.
Test runner: `pnpm --filter @aqui-suena/api test`.

## Specs

- **S1 — A cancelled subscription keeps its plan until the paid period ends.** `SPEC-memberships.md:165`: "Cancellation stops renewal but keeps the paid plan active until the end of the billing period". `SubscriptionService.cancel()` sets status `cancelled` and leaves `endsAt` intact, and the cancellation email reports `activeUntil: endsAt`. `resolvePlan` returns `planId` while `now < endsAt` and `community` at `now >= endsAt`; the interval end is exclusive.
- **S2 — A subscription in the failed-renewal grace keeps its plan while the window is open.** `SPEC-memberships.md:165`: failed renewals use the 7-day grace before downgrade. The boundary is delegated to `isInGracePeriod(graceEnd, now)` from `domain/billing/subscriptions/grace.ts` (`now <= graceEnd`, inclusive) so the two definitions cannot drift; no hand-rolled comparison.
- **S3 — Existing semantics are preserved.** No subscription, `startedAt > now`, `active` with a null or future `endsAt`, `active` with `endsAt <= now`, and `expired` keep their previous results. The `startedAt` guard applies to every status.
- **S4 — The clock is injectable.** `resolvePlan(subscription, now = new Date())`; existing callers are unchanged. A status added to `SUBSCRIPTION_STATUSES` must break the build rather than silently resolve to `community`, which the exhaustive `switch` under `strict` guarantees.
- **Out of scope:** `changePlan` and `cancel` requiring status `active` (a cancelled-but-paid account cannot change plans during the remaining time); `failRenewal` writing status and `graceEnd` in two steps; `business-carousel` not passing its `now` to `getActive`/`resolvePlan`.

## Tasks

- T1 / S1-S4 — `resolvePlan` rewritten with an exhaustive status switch, injectable clock and the shared grace boundary; the test asserting `community` for a cancelled subscription was replaced because it encoded the bug. DONE. RED: 2 failed (`expected 'community' to be 'commerce'`). GREEN: 15 tests in `ad-plan.test.ts`, 659 in the api suite. Commit `43870fd`.

## Log

### L2 — 2026-11-10 — closing evidence

- `fix(billing): keep the paid plan through the paid period and the grace window` — `43870fd`.
- RED: `keeps the paid plan when a cancelled subscription still has paid time left` and `keeps the paid plan during the failed-renewal grace window` returned `community` instead of `commerce`.
- GREEN: `pnpm -r typecheck`, `pnpm exec biome check .` (411 files) and the api suite at 659 tests.
- Independent verification: every requirement met, zero blockers; a scratch experiment adding a fifth status produced `TS2366`, confirming the switch is exhaustively checked.
- Boundary coverage after verification: `endsAt` exclusive for `cancelled`, `graceEnd` inclusive for `grace`, plus fail-closed cases for `endsAt: null` and `graceEnd: null`.
- A first transcription of the verification probes failed twice because `makeSubscription` defaults `startedAt` to `Date.now() - 1000`, which is later than the fixed `now` used by those tests; the probes had never been executed before being handed over. Fixed by setting `startedAt` explicitly.
- No push, no merge at the time of this log.

### L1 — 2026-11-10 — original request (verbatim)

ya se mergio el #6, vamos con el resolvePlan
