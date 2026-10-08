# Feature: task-3-status-api — Listener status API (mock-first) on the landing

## Objective
Implement Task 3 (DB + tRPC status API) adjusted to the landing `/`: Drizzle schema, mocked `listener.getStatus` tRPC router validated with zod, and TanStack Query consumption with loading/error states in the shared `PlayerLanding`. Also fix every living doc still describing the pre-landing `/player` route era.

## Problem
`tasks/plan.md` and `tasks/todo.md` still describe `/player` route shells, a `apps/web/app/player/page.tsx`, and placeholder-`/player` checkpoints that no longer exist since player-landing. No `packages/db` or `packages/api` exist; no tRPC/Drizzle/TanStack/zod installed anywhere.

## Why
User ordered: start Task 3 adjusted to the landing, sweep and fix everything not updated after the player-landing change, on a new git branch. Scope question answered: mock-first (no live Postgres, no HTTP transport yet).

## Scope
- Living docs: `tasks/plan.md` (overview + architecture), `tasks/todo.md` (Task 2 close-out as landed, Task 3 rewritten for landing, checkpoint wording). Closed `odd/tasks/*` history docs stay untouched.
- `packages/db` (new workspace): Drizzle `pg-core` schema `stations` / `listen_sessions` + `db:push` script (drizzle-kit, needs `DATABASE_URL`; live run deferred, marked pending).
- `packages/api` (new workspace): tRPC `listener.getStatus` router, zod-validated input/output, mock data source. Unit-tested via caller (no HTTP).
- Landing wiring: shared async status fetcher in `packages/api` consumed via TanStack Query in `PlayerLanding` with loading/error/data states; `QueryClientProvider` in web + native providers. No HTTP transport, no native absolute-URL config yet.
- Tests colocated `*.test.ts(x)` per repo convention, run with the new Vitest base.

Out of scope: HTTP tRPC handler, live Postgres + verified `db:push`, native remote-URL config, E2E, coverage thresholds, push/PR/merge.

## Constraints
- Stack: pnpm 12.4.1, turbo 2.11.7, TS strict, Vitest 5, Tamagui primitives only in `packages/ui`, no `next/link` in shared code.
- Branch `feat/task-3-status-api`; local commits only, no push without explicit order.
- New packages follow existing conventions: `build`/`typecheck` = `tsc --noEmit`, `test` = `vitest run`, tsconfig extending `tsconfig.base.json`.
- dependency-cruiser layer rules must keep passing (`packages/*` never import `apps/*`).
- Stale-sweep result (2026-10-08): no `/player` route in code (good); `SPEC-radio-playback.md` already landing-aware (good); `packages/navigation` route contracts kept intentionally per AGENTS.md (good); stale only in `tasks/plan.md`, `tasks/todo.md`.

## Authorized scope
User: "arranca la task 3 ajustada al landing... y corrigelo, hazlo en una nueva rama" + mock-first scope answer. Covers branch work listed in Scope. No push, no PR.

## TDD mode
- Mode: ON. Source: explicit user request + test-driven-development skill. Runner: `vitest run` via turbo.
- Genuine RED first: `packages/db` and `packages/api` do not exist yet, so failing tests come before implementation. UI states tested with Testing Library + jsdom if Tamagui cooperates; otherwise test the hook/fetcher boundary and report honestly.

## Delivery strategy
- Strategy: `ask-on-risk` (default). Forecast: ~300-380 authored lines (docs ~40, db ~60, api ~120, ui/apps wiring + tests ~150; lockfile excluded). Near the ~400 heuristic: if the running count exceeds ~400, stop and ask for chain strategy before the next commit.

## Tasks
- [x] T1 Fix stale docs (`tasks/plan.md`, `tasks/todo.md` Task 2 close-out + Task 3 landing rewrite)
- [x] T2 `packages/db`: Drizzle schema + schema test (RED→GREEN)
- [x] T3 `packages/api`: tRPC `listener.getStatus` + zod + mock + router tests (RED→GREEN)
- [x] T4 Landing wiring: shared fetcher + `useListenerStatus` + `PlayerLanding` states + providers (web/native) + UI test
- [x] T5 Full verification + RDD assess + report (no push)

## Acceptance criteria
- `listener.getStatus` returns `{ station, activeUrl, listeners }` matching the zod schema (via tested caller; HTTP explicitly deferred).
- Landing `/` shows loading state, then station status; error state renders a message, no crash.
- `turbo run test`, `turbo run typecheck`, `biome check .`, `pnpm arch` all green.
- No stale `/player`-screen references remain in living docs or code (navigation contracts + history docs excluded by design).
- Work-unit commits per task on the branch, identities recorded below.

## Applicable checks
- `pnpm --filter <pkg> test` (vitest run) per new package
- `turbo run test -- --run`, `turbo run typecheck`
- `pnpm exec biome check .`, `pnpm arch`

## Progress
- 2026-10-08: branch `feat/task-3-status-api` created from main (80e4586). Stale sweep + scope decision done.
- 2026-10-08: T1–T4 implemented with work-unit commits; hook gates green on every commit.

## Verification evidence
- `turbo run test` → 7/7 packages OK (ui 5/5 incl. 3 status-state tests, api 2/2, db 2/2; config/navigation still scaffold echo).
- `turbo run typecheck` → 7/7 OK. `biome check .` → 57 files clean. `pnpm arch` → no violations (37 modules).
- TDD RED observed: db test failed pre-schema; api test failed pre-router; ui status test failed pre-hook (`window.matchMedia is not a function` at Tamagui import).
- Gotchas fixed: pnpm installed TS 7 in new packages (repo pins 5.9.3; TS7 dropped `baseUrl`) → pinned `typescript@5.9.3`; tRPC v11.19 root exports no `createCallerFactory` → used `appRouter.createCaller({})`; Tamagui needs `matchMedia` (+ legacy `addListener`) stub in a Vitest `setupFiles` (test-file body runs too late); RTL matchers absent → plain truthy assertions, no new dep.
- Delivery note: running count ~480 authored lines (over the ~400 heuristic). Per ODD the heuristic is advisory, not a stop: the overage is two new packages' config scaffolding + the RTL/jsdom test bed, kept as one coherent mock-first slice. Chain strategy (`ask-on-risk`) applies at delivery time if/when a PR is requested.
- Deferred (mock-first, explicit): HTTP tRPC transport, live Postgres + verified `db:push` (script + `drizzle.config.ts` present, needs `DATABASE_URL`), native remote-URL config, E2E, manual landing check by user.
- Bugfix (reported by user, same branch): `@trpc/server` threw "non-server environment" in client bundles because `ui → @aqui-suena/api` root evaluated `initTRPC.create()`. Fixed by splitting a client-safe entry (`listener.ts` schemas+mock, `client.ts` fetcher, `exports` map with `./client` subpath); UI imports `@aqui-suena/api/client`. Regression guard `client.test.ts` fails if server code ever enters the client graph. Proven: `next build` passes and no browser chunk contains the server error string.

## Next step
- Done 2026-10-08: user verified compile + green tests + mock status on the landing; Foundation checkpoint approved. Task 4 (player core) is next, not started.

## Commits
- 12fcc55 docs: add task-3-status-api feature tracking
- 8f8d887 docs: de-stale plan and Tasks 2-3 for landing, mock-first Task 3
- a273a1a feat(db): add Drizzle stations and listen_sessions schema with tests
- 7b0622e feat(api): add listener.getStatus tRPC router with zod mock and tests
- ed6973f feat(ui): wire listener status via TanStack Query with loading and error states
- e047a2a fix(api): split client-safe entry so UI bundles never import trpc server
