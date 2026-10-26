# Feature: task-6-expo-audio — Real audio driver (Task 6 start)

## Objective

Replace the temporary noop driver with a real `expo-audio` driver shared by web and native, so the landing actually plays the temporary stream chain with autoplay.

## Problem

The landing shows a playing card with no audio behind it (noop driver). `expo-audio` works on iOS/Android/Web per source docs, but its `play()` is sync and failures arrive as status events — the promise-based `AudioDriver` contract needs a bridge.

## Why

User ordered Task 6 start with expo-audio after closing Task 5.

## Scope

- `packages/ui/src/expo-driver.ts` (new): `useExpoAudioDriver()` implementing `AudioDriver` over `useAudioPlayer`/`useAudioPlayerStatus`; `toMediaFailure()` mapping status errors (blocked-like → NotAllowedError shape, unsupported-format → code 4, rest generic so rotation engages).
- `packages/ui/src/expo-driver.test.ts`: bridge tests with mocked expo-audio (resolve on playing, reject on error, replace+play called) + pure mapper tests.
- `packages/player/src/streams.ts` (new): `STREAM_FALLBACK_URLS` (SomaFM groovesalad ice1/2/3 chain), exported from index.
- Landing: `useExpoAudioDriver` + real chain instead of noop/placeholder.
- Test seam: vitest alias `expo-audio` → static double (playing) so node/jsdom suites never load native modules; `vi.mock` override inside `expo-driver.test.ts` for controllable states.

Out of scope: background modes / silent-switch handling (Task 7), coverage thresholds, E2E, push/PR/merge.

## Constraints

- `expo-audio` declared only in `packages/ui` (single importer). Expo Go inclusion assumed (core SDK successor of expo-av) — user verifies on emulator; dev-build fallback documented if Go lacks it.
- No floating promises: bridge settles or stays documented; `attempt()` totality invariant from Task 4 still holds (mapper total).
- Branch `feat/task-6-expo-audio`; local commits only, no push without explicit order.

## Authorized scope

User: requested the Task 5 close and the Task 6 start with the expo-audio implementation. Covers research + implementation. No push, no PR.

## TDD mode

- Mode: ON. Runner: vitest via turbo. RED first for bridge + mapper (mocked module), then GREEN.

## Delivery strategy

- Strategy: `ask-on-risk` (default). Forecast: small (~150 authored lines).

## Tasks

- [x] T1 Driver + mapper + tests (RED→GREEN)
- [x] T2 Test seam (alias + double) + landing wiring + stream chain
- [x] T3 Pivoted to platform drivers (evidence: expo-modules-core main is TS source importing TurboModuleRegistry, absent on web): `expo-driver.ts` (web HTMLAudio) + `expo-driver.native.ts` (expo-audio bridge), shared `narrowFailure` in player, dead helper + seam removed
- [x] T4 SomaFM hotlink 403 fixed with same-origin proxy: `referrerpolicy` proven ineffective on media elements (not in spec/TS DOM lib), so web plays via `/api/stream` (allowlisted, tested core) instead
- [x] T5 Verification + close: audible on web AND native (user-confirmed 2026-10-08) — expo-audio IS in Expo Go, no dev build needed

## Verification evidence

- `pnpm --filter ui test` → green incl. real HTMLAudio-element tests (stubbed Audio) and native bridge tests (mocked module). `turbo test` 8/8, typecheck 8/8, `biome check .` clean, `pnpm arch` clean.
- `pnpm --filter web build` compiles: no expo native code in the web graph (proven by build, not by assertion).
- Audible autoplay + Expo Go presence of expo-audio: pending user verification on emulator/browser.

## Acceptance criteria

- `play(url)` calls replace+play and settles from status events (resolve on playing, reject shaped on error).
- Landing plays the real chain on mount; mock-only states replaced by live ones.
- Gates green; no native-module imports in node/jsdom suites.

## Applicable checks

- `pnpm --filter @aqui-suena/ui test`, typecheck, biome, arch.

## Progress

- 2026-10-08: branch from main (343418b). expo-audio ^57.0.5 installed in ui.

## Verification evidence

- (pending)

## Next step

- T1 driver RED.

## Commits

- (pending)
