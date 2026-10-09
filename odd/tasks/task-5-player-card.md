# Feature: task-5-player-card — PlayerCard UI (ping-pong)

## Objective
Build the shared Tamagui `PlayerCard` (Task 5): station status text, `blocked` one-tap resume, and an in-place station selector. No station screens and no router imports in shared code by product decision. Ping-pong: agent RED tests, user GREEN implementation (plus agent-built slices on explicit user request).

## Problem
`usePlayer` states have no UI home yet; the landing still shows static copy. No `PlayerCard` exists in `packages/ui`.

## Why
User ordered Task 5 start under the established ping-pong model, then decided: no station pages (player switches in place), selector mechanism inside the player.

## Scope
- `packages/ui/src/player-card.tsx`: presentational component (props in, no hook inside) so web and native render the same card; Tamagui primitives only, never `next/link`, no router imports at all.
- Contract: `playing` shows status + listeners, no resume button; `blocked` shows the resume tap and nothing else clickable; `error` shows the mirror message; selector lists stations and calls `onSelectStation`, visible in playing/error, hidden while blocked; no selector rendered unless stations + handler provided.
- `packages/navigation`: player route contract removed (zero consumers); package kept as documented home for future modules.
- Tests: `player-card.test.tsx` (RTL + jsdom, existing setup).

Out of scope: wiring multi-station data into the landing (awaits the stations catalog), pause behavior, E2E, push/PR/merge.

## Constraints
- Tamagui primitives + tokens only.
- Status/message strings mirror the error-mapper contract (`Tap to enable sound`, `Signal unavailable, trying mirror…`).
- Branch `feat/task-5-player-card`; local commits only, no push without explicit order.

## Authorized scope
User: Task 5 start + onOpen direction + no-station-pages decision + selector mechanism answer. Covers implementation and doc updates. No push, no PR.

## TDD mode
- Mode: ON (strict). Runner: vitest via turbo. Genuine RED first for each slice.

## Delivery strategy
- Strategy: `ask-on-risk` (default). Forecast: small (~200 authored lines).

## Tasks
- [x] T1 Deps + RED tests for PlayerCard (agent)
- [x] T2 GREEN implementation (agent on user request; user attempted raw-HTML version first — logic correct, rewritten to Tamagui + Solito per conventions)
- [x] T3 Landing wiring with temporary noop driver (agent on user request to preview; expo-audio replaces it in Tasks 6-7)
- [x] T4 Solito Link replaced with onOpen callback (user chose fight-then-callback; Expo Router 57 vendors forked navigation contexts — proven unwinnable — plus dead nav deps pruned, docs updated)
- [x] T5 No-station-pages decision: onOpen removed, in-place selector added to card, player route contract removed from navigation, living docs updated
- [x] T6 Native navigation redbox fixed, then Solito fully replaced; user confirmed web + native working 2026-10-08

## Verification evidence
- `pnpm --filter ui test` → 12/12 (states, resume, selector shown/hidden/escape-hatch). `turbo typecheck` 8/8, `biome check .` clean, `pnpm arch` clean.
- Selector contract: visible in playing/error (escape hatch), hidden while blocked (single tap only); renders only when stations + onSelectStation provided, so the single-station landing stays unchanged until the catalog exists.

## Acceptance criteria
- `playing` shows status + listeners with no resume button; `blocked` shows exactly one tap (resume); `error` shows the mirror message.
- Station selector lists stations, calls `onSelectStation` with the id, hides while blocked.
- `turbo run test`, `turbo run typecheck`, `biome check .` green.

## Applicable checks
- `pnpm --filter @aqui-suena/ui test`, typecheck, biome.

## Progress
- 2026-10-08: branch from main (f132f0f). Slices implemented with work-unit commits; hook gates green on every commit. Closed: user-verified web + native.

## Next step
- Done: Task 6 (web autoplay with expo-audio) is next.

## Commits
- (recorded in git log on feat/task-5-player-card)
