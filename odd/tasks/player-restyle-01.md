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
- Teaching: every RED error and GREEN snippet ships with a junior-level explanation (why the error, why GREEN passes, line-by-line, why it is CLEAN CODE).
- Dictation: every file edit names the repo-relative file path plus exact line numbers plus a nearby code anchor. Test edits also ship the exact pnpm watch command for those tests.

## Authorized scope
User: "vamo a darle pues" after approving the console mock (2026-10-15). Covers design-01 restyle implementation on the feature branch. No push, no PR.

## TDD mode
- Mode: ON (source: standing session agreement). Runner: vitest via `turbo run test -- --run`. RED observed before GREEN per slice.

## Delivery strategy
- Strategy: `ask-on-risk` (default). Forecast: ~350-450 authored lines (near the ~400 advisory heuristic: if the running count exceeds ~400, stop and ask for chain strategy before the next commit).

## Tasks
- [x] R1 Noche/Brasa theme tokens + font wiring + token tests (route: dictated)
- [x] R2 Dock layout (bottom dock dark / player-top light, 390 composition, 44px targets) + headed user verify (route: dictated)
- [ ] R3 Missing states (idle branch + station sheet + state tests; sheet = BOTTOM OVERLAY per reference image Descargas/Selector de estaciones (en el lugar).png: drag handle, rows with dot + En vivo + accent check on active, backdrop dismiss; sheet scales to large catalogs via scroll + stable keys, virtualization deferred; empty + ad-countdown moved to ads-display/owner modules — no triggers exist yet) (route: dictated)
- [ ] R4 i18n additions ES/EN + parity tests (route: dictated)
- [ ] R5 Full gates + headed web + native approval + close (route: dictated)

## Acceptance criteria
- Landing matches design-01 Main (dark dock abajo) and Owner (light player arriba) compositions; all 9 states reachable and bilingual.
- `turbo run test -- --run` 8/8, typecheck + biome clean; user approves headed look on web + native.

## Applicable checks
- Focused `vitest` runs, `turbo run test -- --run`, typecheck, biome.

## Progress
- 2026-10-15: R3a idle GREEN (tapToPlay keys ES/EN, card idle branch + dot-null + pass-through, suite green, apps working). Next: R3b station sheet.
- 2026-10-15: R3b overlay GREEN (bottom overlay per reference image: backdrop + handle + dots + check; sheet state lifted to StationPlayer; ui 80/80 + tsc clean + headed web by agent + headed native by user). Committed ecf00f9 (idle) + 6c50dd4 (overlay). Next: R3b-3 chips removal decision.
- 2026-10-15: doc created + explore map done. Branch feature/player-restyle-01 active.
- 2026-10-15: R1a tokens GREEN (6/6 config tests, typecheck 8/8, full turbo test 8/8). Next: R1b font wiring.
- 2026-10-15: R1b font GREEN (web next/font + native expo-font, both tsc clean, emulator verified). R1 complete. Next: R2 dock layout RED.
- 2026-10-15: R2a dock container GREEN (player-dock testID + Noche surface/border + 24px radius, full card suite green). Next: R2b 44px targets.
- 2026-10-15: R2b chips 44px GREEN (minH on both selectors, suite green, headed web + native verified). minHeight rejected by Button types, minH shorthand used. Split across 394f192 + f30e22b. R2b closed. Next: R2c primary 52px.
- 2026-10-15: R2c primary 52px GREEN (minH on pause/resume/tap-to-enable, suite green, headed web + native verified). Committed bb59bdb. Next: R2d themes + light order.
- 2026-10-15: R2d themes GREEN (noche/brasa alias themes in config, 8/8 config tests, additive over preset). Committed 3f64810. Next: R2e provider noche + card generic.
- 2026-10-15: R2e in progress (Theme noche in UiProvider, dock root to $surface/$border). Partial themes crashed web (circular errors were secondary; Tamagui $color warning was the real clue); fixed with dark/light base spread + completeness test.
- 2026-10-15: R2e GREEN (9/9 config tests, suite green, headed web + native identical after dev restart — Turbopack had served a stale graph). Committed 125743a.
- 2026-10-15: R2f RED (scheme order tests: dock after content in noche, before in brasa). Design 01 Main vs Owner compositions. Next: R2f GREEN + headed (closes R2).
- 2026-10-15: R2f GREEN (scheme prop + Theme + order + 390 + centered + seamless $bg; 2 order tests green; headed web + native verified). R2 CLOSED. Committed 8006e50 + 0377421 + 6ded314. Next: R3 scope decision (idle + sheet now; empty + ad to their modules).

## Verification evidence
- packages/config 6/6 green (noche/brasa pairs), turbo typecheck 8/8, turbo test 8/8 via pre-commit hooks.
- R1b: web + native tsc clean, headed emulator font verified by user.
- R2a: player-card suite all green including new dock test (old behavior untouched).
- R2f: order tests green both schemes; headed noche verified web + emulador (dock bottom, centered, seamless); brasa order unit-covered.

## Commits
- adda25f feat(tokens): add Noche Brasa theme pairs with tests
- eed3eb7 docs(tasks): record R1a tokens green adda25f
- 8e413a2 feat(font): wire Plus Jakarta Sans web and native
- 78477e7 feat(dock): add player-dock container with Noche styling
- 394f192 feat(chips): enforce 44px min touch targets
- f30e22b feat(chips): enforce 44px targets in loading selector
- bb59bdb feat(buttons): enforce 52px min primary targets
- 3f64810 feat(themes): add Noche Brasa alias themes
- 125743a feat(theme): activate Noche theme and generic dock tokens
- 8006e50 fix(theme): complete light/dark theme matrix
- 0377421 feat(layout): noche/brasa compositions with bottom dock
- 6ded314 fix(viewport): center column and paint shell backgrounds
