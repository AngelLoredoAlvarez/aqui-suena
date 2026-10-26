# Feature: player-visual-design — Visual design for player + landing (functional)

## Objective

Give the proven playback core a real visual identity without breaking behavior: brand tokens, a designed PlayerCard with all states, and a composed landing. Every pixel change rides on the existing behavior tests — visual and functional.

## Problem

PlayerCard + landing render with the Tamagui default preset: no brand, no hierarchy, no state language (playing vs paused vs error look identical except for text). Verified earlier as "preset working as designed, not a bug" — but MVP-complete means design debt is now the top gap.

## Why

Playback risks are retired (audible web + native, background, bilingual). Design now lands on solid ground instead of churning over broken audio.

## Scope

- Brand tokens in `packages/config/tamagui.config.ts` (new `brand` palette only, additive — no existing token changes): night-plum surface scale, warm amber accent, cream text. Exact ramps chosen by implementer within that constraint; recorded in Progress.
- PlayerCard restyle: station title hierarchy, status indicator dot (green playing / amber paused / neutral loading / red error; blocked keeps single-tap), big round pause/resume affordance reusing dictionary strings (no new copy keys unless unavoidable — if added, both locales + parity), listeners line, station selector as chips. Tamagui primitives only, keyboard accessible, `aria-label`s bilingual from dictionary.
- Landing composition: brand H1, card, switcher, ads carousel with spacing rhythm; loading branch keeps its copy.
- All existing behavior tests stay green (update selectors only if roles change, explicitly); add 2-3 tests pinning the new affordances (e.g. pause button role/label per locale, dot per status via testID or role).

Out of scope: artwork/cover images, animations, dark/light toggle, ads carousel restyle, new locales, push/PR/merge.

## Constraints

- TDD: behavior tests first/green throughout; visual choices verified by user headed (agent cannot see).
- No hardcoded copy; no router imports in shared code; no existing-token edits.
- Branch `feat/player-visual-design`; local commits only, no push without explicit order.

## Authorized scope

User: requested a functional visual component for the landing. Covers design + implementation. No push, no PR.

## TDD mode

- Mode: ON. Runner: vitest via turbo. RED first per slice.

## Delivery strategy

- Strategy: `ask-on-risk` (default). Forecast: small-medium (~200 authored lines).

## Tasks

- [x] T1 Brand tokens (additive) + token tests
- [x] T2 PlayerCard restyle (all states) + affordance tests, behavior green
- [x] T3 Landing composition + headed user review + close (2026-10-12: user approved headed web + native)

## Acceptance criteria

- Card shows distinct visual language per status; pause/resume/blocked/error/loading all reachable and bilingual.
- `turbo run test -- --run` 8/8, typecheck + biome clean; user approves headed look on web + native.

## Applicable checks

- Focused `vitest` runs, `turbo run test -- --run`, typecheck, biome.

## Progress

- 2026-10-09: branch from feat/task-8-e2e tip. No writes yet.
- 2026-10-09 T1 done (RED->GREEN): new `packages/config/src/tamagui.config.test.ts`
  (vitest, mirroring api/player/ui conventions; config had no tests, script was
  `echo`). RED observed: 2 brand tests failed, preset-untouched passed 1/3.
  GREEN: additive `brand` color group in `packages/config/tamagui.config.ts`
  (preset ships no color token group; numeric ramp ascending lightness like
  space/size). Chosen palette: night-plum brand1 `#150e22`, brand2 `#1e1430`,
  brand3 `#2a1c42`, brand4 `#3a2857`, brand5 `#4e3a6e`, brand6 `#665085`;
  amber brandAccent `#e9a13b` / Hover `#f2b45c` / Press `#c77f22`;
  cream brandCream `#f8f1de` / Muted `#cdbfa4`. Deviation (explicit):
  added brandSuccess `#3dd68c` + brandDanger `#e5484d` for the status dot —
  required because Tamagui style props accept only tokens under strict TS,
  so component-local hexes do not typecheck. No preset token edited
  (test pins space/size/radius/zIndex equality vs createTamagui(defaultConfig)).
- 2026-10-09 T2 done (RED->GREEN): 3 new ui tests failed RED with 53 existing
  green; after restyle full ui suite 56/56 green. PlayerCard keeps props/logic
  contract (onPause/onResume/stations/onSelectStation, selector visibility
  rules, all copy from dictionary, no new i18n keys). Changes: plum card
  (`$brand2` surface, `$brand5` border, `$6` radius, max 480), cream `$8` bold
  station title, status dot 12px round (`testID="status-dot"`: `$brandSuccess`
  playing / `$brandAccent` paused / `$brand6` loading / `$brandDanger` error,
  none for blocked), pill amber pause/resume/blocked buttons (`$5`/`$4`,
  hover/press states, bilingual `aria-label` from dictionary), muted
  listeners/status lines, pill chips (`$brand3` surface, `testID=
  "station-selector"`). Landing: `$brand1` page surface, cream H1, muted
  loading copy unchanged, `$5` spacing rhythm both branches. No role/selector
  changes: existing getByText/getByRole queries untouched and green.
  Incidents fixed (mine): `Stack` not exported by installed Tamagui (used
  XStack); style longhands rejected by component prop types — this build
  wants shorthands (`bg`, `rounded`, `maxW`, incl. inside hover/pressStyle).

## Verification evidence

- `pnpm --filter @aqui-suena/ui test`: 7 files, 56 passed (53 baseline + 3 new).
- `pnpm --filter @aqui-suena/config test`: 4 passed (3 token + 1 untouched-preset).
- `pnpm turbo run test -- --run`: 8 successful, 8 total.
- `pnpm turbo run typecheck`: 8 successful, 8 total.
- `biome check` on all 6 touched paths: clean, no errors.
- Headed look (web + native): DONE 2026-10-12 — user approved, T3 closed.

## Next step

- Closed 2026-10-12: user approved headed web + native, T3 + Task 9 ticked.

## Commits

- `feat(ui): brand tokens and player visual design` (local only, no push)
