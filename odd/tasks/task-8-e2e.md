# Feature: task-8-e2e — Verification + headed e2e

## Objective
Lock the radio-playback MVP with automated gates: Playwright e2e for autoplay allowed/blocked, mirror fallback, pause/resume, and es/en copy, plus 80% line coverage in `packages/player` and Tamagui parity web/native. Headed audible confirmation stays human (agent cannot hear).

## Problem
No e2e infra exists (`apps/web/e2e/` absent, no Playwright dependency, browsers not installed). `packages/player` coverage is unmeasured against the 80% bar. Copy is now bilingual, so e2e must cover both locales or it locks only half the UI.

## Why
Todo Task 8 + Complete checkpoint require it. e2e written now covers es+en from day one; written later it rewrites. Coverage proves the fallback/error/pause state machine before release.

## Scope
- Install `@playwright/test` in apps/web only + `playwright.config.ts` (chromium, headed-capable, `webServer` reusing `next dev`, single locale projects es/en or locale-matrix via storage state).
- `apps/web/e2e/player.spec.ts`: landing renders shared player; autoplay allowed path shows playing (or blocked tap when policy blocks); blocked tap resumes; fallback engages on primary failure (route-abort primary mirror); pause/resume buttons flip status; es + en copy assertions via locale switcher; zero console errors.
- `packages/player` coverage ≥80% lines (vitest coverage; install `@vitest/coverage-v8` if missing): fallback picker, error mapper, usePlayer pause/resume/blocked paths. RED first for every new test.
- Tamagui parity: same selectors/roles resolve in headed chromium (native parity remains user device check).
- Test scripts wired so `turbo run test` stays green (e2e excluded from unit gate or tagged `@e2e` with its own script `test:e2e`).

Out of scope: audible assertion automation (human ear), native e2e (Detox/Maestro), push/PR/merge, visual-regression snapshots.

## Constraints
- TDD strict for unit/coverage; e2e specs first, green on headed run (agent runs headless smoke; user runs headed + listens).
- No new deps outside: `@playwright/test` (apps/web), `@vitest/coverage-v8` if needed, Playwright browsers via `npx playwright install chromium` (+ ` --with-deps` only if user approves system packages).
- Branch `feat/task-8-e2e`; local commits only, no push without explicit order.

## Authorized scope
User: approved the Task 8 start after an explicit kickoff question. Covers infra + specs + coverage. No push, no PR. User runs headed + listens and reports.

## TDD mode
- Mode: ON. Runner: vitest via turbo (unit) + playwright (e2e). RED first per slice.

## Delivery strategy
- Strategy: `ask-on-risk` (default). Forecast: medium (~300 authored lines incl. config).

## Tasks
- [x] T1 Playwright infra (install, config, webServer, scripts) + smoke spec green
- [x] T2 e2e specs (autoplay allowed/blocked, fallback, pause/resume, es/en copy, console-clean)
- [x] T3 player coverage to 80% + Tamagui parity assertions
- [x] T4 Verification (gates + user headed audible/device checks) + close

## Acceptance criteria
- `pnpm --filter web test:e2e` passes headless here; user confirms headed audible + device checks.
- `packages/player` line coverage ≥80% with report as evidence.
- `turbo run test -- --run` still 8/8; typecheck + biome clean.

## Applicable checks
- `turbo run test -- --run`, typecheck, biome, `playwright test` headless smoke.

## Progress
- 2026-10-09: branch from feat/i18n-locales tip. No writes yet.
- 2026-10-09: T1 done — `@playwright/test` installed (apps/web devDep), `apps/web/playwright.config.ts` (chromium-es + chromium-en projects differing only by context locale es-ES/en-US, webServer `pnpm dev`, E2E_PORT default 3100), `test:e2e` script in apps/web (unit gate untouched). Smoke green 2/2.
- 2026-10-09: T2 done — `apps/web/e2e/player.spec.ts` (6 tests x 2 projects): smoke, autoplay-allowed-or-blocked-tap, deterministic blocked tap resume (init-script play gate), primary abort -> fallback (ice1 requested + ice2 requested + playing), pause/resume flip, switcher es/en flip + reload persistence. Console/pageerror fail-on-any (fallback allowlists only the exact Chromium `net::ERR_FAILED` report of the injected abort). Headless 12/12 green.
- 2026-10-09: T3 done — `packages/player` line coverage 100% (statements 100%, functions 100%, branches 90.69%) via `vitest run --coverage` (`@vitest/coverage-v8@5` added to packages/player). Added unmount-cancels-autoplay unit test (covered last line 124). Tamagui parity: all e2e assertions are role/text selectors resolving through Tamagui web output; native parity stays a user device check (T4).

## Verification evidence
- `pnpm turbo run test -- --run`: 8 successful, 8 total (player 24/24; e2e excluded from unit gate by design).
- `pnpm --filter @aqui-suena/player test`: 3 files, 24 tests passed.
- `E2E_PORT=3000 pnpm --filter web test:e2e` (headless, reused running dev server): 12 passed.
- `pnpm turbo run typecheck`: 8 successful (covers playwright.config.ts + e2e specs).
- `pnpm exec biome check` on touched paths: clean (after --write format pass on player.spec.ts).
- Coverage: lines 100% (78/78), statements 100% (81/81), functions 100% (15/15), branches 90.69% (39/43). Reproduce: `pnpm --filter @aqui-suena/player exec vitest run --coverage`; HTML report at `packages/player/coverage/index.html` (gitignored, regenerate on demand).
- RED trail: T1 `pnpm --filter web test:e2e` -> ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT, `exec playwright test` -> first-fail (no binary); T2 first full run 10 failed (page stuck loading — root cause: baseURL used 127.0.0.1 and Next 16 blocks cross-origin dev resources, killing hydration; switched to localhost), then 4 failed (StrictMode remount beat the one-shot play stub -> flag-gated stub; abort noise allowlisted to the exact message); T3 coverage showed one uncovered line (use-player.ts:124) before the unmount test.

## T4 user checks (headed audible + device)
- Headed e2e (real playback, listen to confirm audio):
  `E2E_PORT=3000 pnpm --filter web exec playwright test --project chromium-es --headed`
  then `--project chromium-en --headed`. Requires the dev server on :3000 (or drop E2E_PORT to boot a dedicated :3100).
- Audible: confirm music plays on load (or after the tap when policy blocks), pause/resume buttons flip status with audible stop/restart, abort path inaudible-switch to mirror.
- Device: open the native app, confirm landing player + switcher + ads render and playback works; report back heard/not-heard per check.
- 2026-10-09 (user, T4 close): native autoplays audibly on load; web requires tap (policy) then audible; pause/resume flip + audible stop/restart; es/en switch works. No console errors. Task closed.

## Next step
- Done. Closed 2026-10-09 after user audible/device verification.

## Commits
- d596477 test(e2e): playwright infra, player specs, 80% player coverage (T1-T3)
