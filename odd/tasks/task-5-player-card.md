# Feature: task-5-player-card — PlayerCard UI (ping-pong)

## Objective
Build the shared Tamagui `PlayerCard` (Task 5): station status text, `blocked` one-tap resume, Solito deep link to `/player/[stationId]`. Ping-pong: agent RED tests, user GREEN implementation.

## Problem
`usePlayer` states have no UI home yet; the landing still shows static copy. No `PlayerCard` exists in `packages/ui`.

## Why
User ordered Task 5 start under the established ping-pong model.

## Scope
- `packages/ui/src/player-card.tsx` (new): presentational component (props in, no hook inside) so web and native render the same card; Tamagui primitives only, Solito `Link` only, never `next/link`.
- Contract: `playing` shows status + listeners, no resume button; `blocked` shows the resume tap and nothing else clickable; `error` shows the mirror message; deep link to `playerPath(stationId)` always rendered.
- Deps to add on `packages/ui`: `solito` (same 5.0.0 as apps), `@aqui-suena/navigation` (workspace).
- Tests: `player-card.test.tsx` (RTL + jsdom, existing setup).

Out of scope: wiring the card into the landing (next slice), pause behavior, E2E, push/PR/merge.

## Constraints
- Tamagui primitives + tokens only; Solito `Link` for navigation.
- Status/message strings mirror the error-mapper contract (`Tap to enable sound`, `Signal unavailable, trying mirror…`).
- Branch `feat/task-5-player-card`; local commits only, no push without explicit order.

## Authorized scope
User: "ok, iniciemos con la task 5" under the ping-pong model (agent RED, user GREEN). Covers scaffold + RED tests by agent. No push, no PR.

## TDD mode
- Mode: ON (strict). Runner: vitest via turbo. Genuine RED first (no component exists).

## Delivery strategy
- Strategy: `ask-on-risk` (default). Forecast: small (~120 authored lines).

## Tasks
- [x] T1 Deps + RED tests for PlayerCard (agent)
- [x] T2 GREEN implementation (agent on user request; user attempted raw-HTML version first — logic correct, rewritten to Tamagui + Solito per conventions)
- [x] T3 Landing wiring with temporary noop driver (agent on user request to preview; expo-audio replaces it in Tasks 6-7)
- [x] T4 Solito Link replaced with onOpen callback (user chose fight-then-callback; Expo Router 57 vendors forked navigation contexts — proven unwinnable — plus dead nav deps pruned, docs updated)
- [ ] T5 Verification + close

## Verification evidence
- `pnpm --filter ui test` → 10/10 (greeting 2, status 3, card 5). `turbo typecheck` 8/8, `biome check .` clean, `pnpm arch` clean (50 modules).
- Solito Link untestable in jsdom as-is (pulls Flow-typed react-native + Next router): global vitest alias to `src/test-doubles/solito-link.tsx`; href assertions run through the anchor. Navigation itself belongs to Task 8 e2e.
- Tamagui duplicates text nodes in DOM output: role-based queries for actions, cleanup between tests required.

## Acceptance criteria
- `playing` shows status + listeners with no resume button; `blocked` shows exactly one tap (resume); `error` shows the mirror message.
- Deep link points at `playerPath(stationId)`.
- `turbo run test`, `turbo run typecheck`, `biome check .` green.

## Applicable checks
- `pnpm --filter @aqui-suena/ui test`, typecheck, biome.

## Progress
- 2026-10-08: branch from main (f132f0f). No writes yet.

## Verification evidence
- (pending)

## Next step
- Agent: deps + RED tests. Then user GREEN.

## Commits
- (pending)
