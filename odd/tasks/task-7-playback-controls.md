# Feature: task-7-playback-controls — Pause everywhere + native background

## Objective
Pause/resume on web AND native (hook + card + both drivers) plus native background-safe playback. Task 7, cross-platform by requirement.

## Problem
`usePlayer` exposes play/resume only; neither driver exposes pause; the card has no pause affordance. Background modes untouched.

## Why
User requirement: pause/resume must work on web and native (plan wrongly scoped it native-only; fixed in docs).

## Scope
- `AudioDriver` gains `pause: () => void`; `PlayerStatus` gains `"paused"` (explicit state — pausing is not idle, and the landing must not show a loading view for it).
- `usePlayer().pause()`: pauses driver, keeps activeUrl; `resume()` already replays it, unchanged.
- Card: pause button while playing, resume tap while paused.
- Web driver: `element.pause()`. Native driver: `player.pause()` + mount effect `setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" })` (exact recipe from SDK docs).
- Landing wires `pause` through.

Out of scope: lock-screen metadata, track-player evaluation, E2E, push/PR/merge.

## Constraints
- TDD strict, ping-pong as needed; user implements by default, agent on request.
- Background no-crash is device-verified by user (not unit-testable).
- Branch `feat/task-7-playback-controls`; local commits only, no push without explicit order.

## Authorized scope
User: "inicia con la task 7". Covers implementation. No push, no PR.

## TDD mode
- Mode: ON. Runner: vitest via turbo. RED first per slice.

## Delivery strategy
- Strategy: `ask-on-risk` (default). Forecast: small (~150 authored lines).

## Tasks
- [x] T1 Hook pause + paused status + tests (RED→GREEN)
- [x] T2 Drivers pause + native background effect + tests
- [x] T3 Card pause UI + landing wiring + tests
- [ ] T4 Verification (gates + user device checks) + close

## Acceptance criteria
- pause() keeps the url, sets paused, calls driver pause; resume() replays to playing.
- Card: pause button while playing, resume tap while paused, single tap while blocked (unchanged).
- Gates green; background behavior verified by user on device.

## Applicable checks
- Focused `vitest` runs, `turbo run test -- --run`, typecheck, biome, arch.

## Progress
- 2026-10-08: branch from main. No writes yet.
- 2026-10-09: T1 done (hook pause + paused status, commits 9fa46a5/e23546f).
- 2026-10-09: T2 done. RED observed by stashing driver impl: `result.current.pause is not a function` on both drivers (+ audio-mode test). GREEN with impl restored: native `setAudioModeAsync` exact-recipe test + `player.pause()` test; web element-pause test via FakeAudio tracking. Existing proxy/error tests green.
- 2026-10-09: T3 done. RED observed on card (3 failures: no Pause button, no paused UI, selector visible while loading). GREEN after: `onPause` required prop, Pause button while playing, Paused + Resume while paused, `Loading…` while loading, selector visible in playing/paused/error and hidden while blocked/loading. Landing passes `onPause={pause}`; `paused` never hits the loading branch (guard is idle/loading only).

## Verification evidence
- `pnpm --filter @aqui-suena/ui test`: 5 files / 28 tests passed.
- `pnpm --filter @aqui-suena/player test`: 3 files / 23 tests passed.
- `pnpm --filter @aqui-suena/ui typecheck`: clean (`tsc --noEmit`, fixed one mock spread-typing error).
- `pnpm exec biome check packages/ui/src`: clean (15 files).
- `pnpm exec turbo run test -- --run`: 8 tasks successful.

## Next step
- T4 verification/device check (user confirms background no-crash on device).

## Commits
- 9fa46a5 test(player): pause RED — T1.
- e23546f feat(player): hook pause GREEN — T1.
- dfb4818 feat(ui): pause everywhere + background tests and card wiring — T2+T3.
