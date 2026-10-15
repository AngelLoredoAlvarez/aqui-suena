# Feature: player-restyle-01 — Restyle player + landing vs design section 01

## Objective
Restyle the shared player landing to design section 01 (papá Claude package): Noche dark theme by default with bottom rounded player dock, Brasa light variant with player on top, Plus Jakarta Sans, all 9 player states, station sheet, 44px touch targets. Behavior stays green throughout.

## Problem
Current landing renders the proven playback core in a centered brand-plum card (`$brand2`, maxW 480) with inline station chips: no Noche/Brasa theme pair, no dock, system font, chips under 44px, and 4 of 9 design states missing (empty, ad countdown, station sheet, idle). Mapping evidence: explore handoff 2026-10-15.

## Why
Playback + gapless + i18n risks are retired and merged. Design-01 is the user-selected next slice (2026-10-14 next-steps) and the visual contract for oyente screens.

## Scope
- Theme tokens in `packages/config/tamagui.config.ts` (additive Noche/Brasa pairs: bg/surface/surface-2/border/text/muted/accent/on-accent/ok/error; no existing-token edits — Tamagui strict TS only accepts tokens, lesson from player-visual-design).
- Font: Plus Jakarta Sans 400/600/700, base 14px (web via next/font or link in `apps/web`; native via expo-font loading; fallback system-ui).
- Dock layout in `packages/ui` player-landing/player-card: bottom rounded dock (dark) / player-on-top order (light), 390px single-screen composition, 44px min targets (52px primary), Tamagui primitives only, keyboard accessible, bilingual aria-labels.
- Missing states: empty-no-businesses, ad-playing + countdown copy, station sheet (shared Sheet working web + native), idle branch; signal-error keeps mirror copy.
- i18n: new keys only via `packages/ui/src/i18n/locales.ts` ES/EN + parity tests (dock line, chip label, countdown, sheet title, empty copy).
- All existing behavior tests stay green (update selectors only if roles change, explicitly).

Out of scope: owner portal screens, ads-carousel logic, push/PR/merge, new locales, animations.

## Constraints
- TDD ON (RED first per slice); user verifies headed on web + native (agent cannot see).
- No hardcoded copy; no router imports in shared code; additive tokens only.
- Branch `feature/player-restyle-01`; work-unit commits on the branch, local only, no push without explicit order.
- Commits: user runs all `git commit`s; agent dictates exact commands and commits only on explicit user request (rule 2026-10-15).
- Route: dictated (user types per standing rule — writer trigger fires at 2+ files but standing user-types rule wins; agent dictates RED, reviews, verifies).

## Authorized scope
User: "vamo a darle pues" after approving the console mock (2026-10-15). Covers design-01 restyle implementation on the feature branch. No push, no PR.

## TDD mode
- Mode: ON (source: standing session agreement). Runner: vitest via `turbo run test -- --run`. RED observed before GREEN per slice.

## Delivery strategy
- Strategy: `ask-on-risk` (default). Forecast: ~350-450 authored lines (near the ~400 advisory heuristic: if the running count exceeds ~400, stop and ask for chain strategy before the next commit).

## Tasks
- [x] R1 Noche/Brasa theme tokens + font wiring + token tests (route: dictated)
- [ ] R2 Dock layout (bottom dock dark / player-top light, 390 composition, 44px targets) + headed user verify (route: dictated)
- [ ] R3 Missing states (empty, ad countdown, station sheet, idle) + state tests (route: dictated)
- [ ] R4 i18n additions ES/EN + parity tests (route: dictated)
- [ ] R5 Full gates + headed web + native approval + close (route: dictated)

## Acceptance criteria
- Landing matches design-01 Main (dark dock abajo) and Owner (light player arriba) compositions; all 9 states reachable and bilingual.
- `turbo run test -- --run` 8/8, typecheck + biome clean; user approves headed look on web + native.

## Applicable checks
- Focused `vitest` runs, `turbo run test -- --run`, typecheck, biome.

## Progress
- 2026-10-15: doc created + explore map done. Branch feature/player-restyle-01 active.
- 2026-10-15: R1a tokens GREEN (6/6 config tests, typecheck 8/8, full turbo test 8/8). Next: R1b font wiring.
- 2026-10-15: R1b font GREEN (web next/font + native expo-font, both tsc clean). R1 complete. Next: R2 dock layout RED.

## Verification evidence
- packages/config 6/6 green (noche/brasa pairs), turbo typecheck 8/8, turbo test 8/8 via pre-commit hooks.

## Commits
- adda25f feat(tokens): add Noche Brasa theme pairs with tests
