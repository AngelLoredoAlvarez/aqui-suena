# Feature: i18n-locales — Multi-language UI (es + en, extensible)

## Objective
Every user-facing string resolves through a typed locale dictionary. Spanish and English ship now; adding a language later means adding one file plus one union entry. Auto-detect from browser/device locale with a manual switcher persisted by the user.

## Problem
All UI copy is hardcoded English in two layers: `packages/player/src/errors.ts` (`describeMediaError` messages) and `packages/ui/src/player-card.tsx` (`Playing`, `Paused`, `Pause`, `Resume`, `Loading…`, `Tap to enable sound`, `Signal unavailable, trying mirror…`, `{n} listening`) plus `player-landing.tsx` (`Aqui Suena`, `Loading station status…`). No locale infra, no provider, no detection, no switcher.

## Why
User requirement: platform must be multi-language (es + en now, more later). Doing it now (~10 strings) is cheap; every new screen (ads, directory) without the contract multiplies migration cost. e2e (todo Task 8) asserts on copy, so the contract must exist before e2e locks wording.

## Scope
- Contract-first: `SupportedLocale = "es" | "en"`, `Dictionary` with one key per string, `getDictionary(locale)` with fallback chain exact → base (`es-MX` → `es`) → default `es`.
- `LocaleProvider` + `useLocale()` in shared code (context: read-heavy, write-rare). Provider takes `locale` + `onChange`; detection lives at each app boundary, never inside Card/Landing.
- Detection: web `navigator.language`, native `expo-localization` (install only if missing); persistence web `localStorage`, native best-available (AsyncStorage if installed, else memory + documented follow-up).
- Migrate Card, Landing, and `describeMediaError` messages to the dictionary. Keep Tamagui primitives only, no router imports in shared code.
- Locale switcher UI on the landing (minimal, shared component).

Out of scope: third language, ICU plural rules beyond a count function, URL-based routing (`/es`), e2e, push/PR/merge.

## Constraints
- TDD strict; user implements by default, agent on request (this run: user ordered agent implementation).
- No `next-intl` (breaks shared-code no-router invariant); no `i18next` until 100+ strings justify it — contract must allow the swap without touching components.
- Branch `feat/i18n-locales`; local commits only, no push without explicit order.

## Authorized scope
User: "va, hagamoslo a tu manera" after choosing Auto + switch manual. Covers implementation. No push, no PR.

## TDD mode
- Mode: ON. Runner: vitest via turbo. RED first per slice.

## Delivery strategy
- Strategy: `ask-on-risk` (default). Forecast: small (~150 authored lines).

## Tasks
- [ ] T1 Contract + dictionaries es/en + tests (key parity, fallback chain, getDictionary)
- [ ] T2 LocaleProvider + useLocale + switcher + persistence + tests
- [ ] T3 Migrate Card/Landing/player errors to dictionary + update tests
- [ ] T4 Verification (gates + user check web es/en + native es/en) + close

## Acceptance criteria
- No hardcoded user-facing English/Spanish left in Card, Landing, or `describeMediaError`; all copy comes from the dictionary.
- Unknown locale falls back to `es`; switching persists across reloads (web) and is honored on both platforms.
- Adding a language = one dictionary file + one union entry, verified by a parity test that fails when a key is missing.

## Applicable checks
- Focused `vitest` runs, `turbo run test -- --run`, typecheck, biome.

## Progress
- 2026-10-09: branch from feat/task-7-playback-controls (needs its Card/Landing). No writes yet.
- 2026-10-09 (agent, T1): RED (6 failing on throwing stub) -> GREEN. New `packages/ui/src/i18n/locales.ts` in `@aqui-suena/ui` (zero-dep; no new package — shared code already owns Card/Landing copy and the ui->player edge already exists, so a new package would add wiring for no benefit): `SupportedLocale`, `Dictionary` (11 keys incl. `listening(count)`), `es`/`en`, `resolveLocale` exact->base->`es`, `getDictionary`. Tests: parity, fallback chain, es/en spot values. ui 35/35.
- 2026-10-09 (agent, T2): RED (11 failing on stubs) -> GREEN. `LocaleProvider` + `useLocale()` (throws outside provider), `LocaleSwitcher` (ES/EN buttons, Tamagui only), `locale-env.ts` boundary helpers (`detectWebLocale` from `navigator.language`, `detectNativeLocale` from injected tag, `load/savePersistedLocale` over a minimal sync store, never throws). Mocks only at the boundary. ui 46/46 after adding UiProvider wrapper to switcher tests (Tamagui buttons need config).
- 2026-10-09 (agent, T3): `describeMediaError` now returns `{status, messageKey}` (key union `tapToEnableSound | signalUnavailable | playbackFailed`) — no hardcoded copy left, no ui<-player cycle; `use-player` untouched (only reads `status`). Card + Landing render from `useLocale()` dictionary; `LocaleSwitcher` on both landing branches. player tests updated to keys (explicit, not silent). Card/landing tests render inside `LocaleProvider` for en (existing assertions) + new es assertions. Boundaries wired: web `providers.tsx` (localStorage persist, effect-based resolve to protect SSR hydration), native `_layout.tsx` (expo-localization `getLocales()` detect + session-memory store; AsyncStorage is the documented follow-up). Installed `expo-localization@57.0.2` in apps/native only (config plugin auto-added). ui 50/50, player 23/23, typechecks (ui/player/web/native) clean, biome clean, `turbo run test -- --run` 8/8.

## Verification evidence
- `pnpm --filter @aqui-suena/ui test`: 7 files / 50 tests passed (fresh).
- `pnpm --filter @aqui-suena/player test`: 3 files / 23 tests passed (fresh).
- `pnpm --filter @aqui-suena/ui typecheck`: clean; player/web/native typechecks also clean.
- `pnpm exec biome check packages/ui/src packages/player/src apps/web/app apps/native/app`: clean (after `--write` for import order).
- `pnpm exec turbo run test -- --run`: 8 successful, 8 total (3 cached = unrelated packages).
- RED observed before each GREEN: T1 6 failing on stub, T2 11 failing on stubs, errors 4 failing on key expectations.

## Next step
- T1 contract RED.

## Commits
- <sha> feat(i18n): typed es/en dictionaries with auto-detect and persisted switch (SHA filled post-commit; swept at T4 close)
