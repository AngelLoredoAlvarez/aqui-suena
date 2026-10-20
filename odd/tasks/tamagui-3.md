# Tamagui 3 upgrade

Branch: `feature/tamagui-3` · Delivery: `ask-on-risk` · Runner: `pnpm test` + Playwright e2e + Android emulator

Objective: upgrade `tamagui` and `@tamagui/config` from 2.7.7 to 3.0.18, keep the frozen v5 config and every existing token/theme value, migrate the UI to the v3 flat style syntax, and preserve the rendered result.

## Specs

- **S1 — Packages at 3.0.18.** The workspace catalog pins `tamagui` to `3.0.18`, `packages/config` pins `@tamagui/config` to `3.0.18`, and the lockfile resolves one physical copy of `tamagui`, `@tamagui/core`, and `@tamagui/web`. `pnpm check:singletons` stays green.
- **S2 — Frozen v5 config.** The canonical config keeps importing `defaultConfig` from `@tamagui/config/v5`; config v6 is out of scope. Every custom `brand`, `noche`, and `brasa` token keeps its exact value, every preset token group stays untouched, and the existing `tamagui.config.test.ts` assertions pass unchanged.
- **S3 — Flat style syntax.** Every style prop uses a bare token name (`bg="surface"`, `color="brandAccent"`, `gap="4"`), and interaction states use inline clauses on the same property (`backgroundColor="brandAccent hover:brandAccentHover press:brandAccentPress"`). No `$`-prefixed style value and no `hoverStyle`/`pressStyle`/`focusStyle` object remains in app code.
- **S4 — Control and text sizes.** Buttons use the v3 named control sizes (`xs`, `sm`, `md`, `lg`, `xl`); text uses the v3 numeric font keys without the sigil. Visual output matches the pre-upgrade baseline at 390px and 1440px, with any unavoidable difference listed in the log before acceptance.
- **S5 — No regressions.** `pnpm typecheck`, `pnpm test`, `pnpm exec biome check .`, `pnpm check:singletons`, the web `next build`, and the web e2e suite (12 tests) pass. Existing behavior and copy assertions stay unchanged.
- **S6 — Verification.** Baseline and post-upgrade screenshots cover the landing (blocked and playing), the player dock, and the station sheet in both locales' shared components. The Android emulator smoke test renders the landing, plays/pauses, and opens the station sheet.

## Tasks

- [x] T1 — Record baseline web screenshots from the unmodified tree (S6). Evidence: `/tmp/opencode/tamagui3/baseline` (`blocked-es-390`, `playing-es-390`, `sheet-es-390`, `playing-en-390`, `playing-en-1440`, `metrics.json`).
- [x] T2 — Bump `tamagui` and `@tamagui/config` to exact `3.0.18`, install, and inspect config compatibility and singleton copies (S1, S2). Evidence: catalog and `packages/config` pins; `pnpm install`; 12/12 singletons; one physical copy of `tamagui`, `@tamagui/core`, `@tamagui/web`.
- [x] T3 — Adapt the canonical config or its types to v3 without changing any token/theme value; config tests green (S2). Evidence: no config source change required; 10/10 config tests unchanged.
- [x] T4 — Migrate style props and interaction states in `packages/ui` to flat v3 syntax (S3). Evidence: five files migrated; no `$` style value, `hoverStyle`, `pressStyle`, or `focusStyle` remains.
- [x] T5 — Migrate button control sizes and text font sizes (S4). Evidence: `lg`/`md`/`xs` control sizes; blocked button `md` + `paddingInline={18}` + `fontSize="4" lineHeight="4"`; locale buttons `xs` + `fontSize="2"` + `fontWeight="400"` to preserve v2 metrics.
- [x] T6 — Run all gates and compare screenshots; record any accepted visual delta (S5, S6). Evidence: all required gates green; web screenshots pixel-identical (AE 0 for playing in both locales and at 1440px, ≤0.92 anti-aliased pixels for blocked and sheet).
- [x] T7 — Android emulator smoke test (S6). Evidence: landing, playing, pause/resume, station sheet, and station switch verified on `emulator-5554`.

## Log

- **L1 — 2026-10-19, user request (verbatim):**
  > si, comitea, mergea a main, pushea al repo remoto, y vamos con tamagui 3

  The commit/merge/push half of the message was completed before this slice (`06a260a`). The remaining authorized outcome is the Tamagui 3 upgrade listed in `odd/tasks/backlog.md`.
- **L2 — 2026-10-19, exploration (read-only).**
  - Latest v3 is `tamagui@3.0.18` / `@tamagui/config@3.0.18`. Peers: React `>=19` and `react-native-safe-area-context`; the repo already runs React 19.3 / RN 0.88 / TypeScript 5.9.3.
  - The v3 upgrade guide recommends a first checkpoint that keeps the existing config values. `@tamagui/config/v5` is retained as a frozen static compatibility pack, so the canonical config stays on v5 and config v6 is a separate design migration.
  - The required syntax migration is: bare token names (no `$` sigil) and flat per-property conditional values (`hover:`, `press:`, `sm:`); `hoverStyle`/`pressStyle`/`focusStyle` and media objects are removed.
  - Control `size` props only accept `xs`/`sm`/`md`/`lg`/`xl` (or `true`); text `fontSize` keeps the numeric keys without the sigil.
  - Our exposure is small: five UI component files, 61 sigiled values, five `hoverStyle`/`pressStyle` blocks, and five button `size` props. No Tamagui `Sheet`, icons, animations, compiler plugins, `useProps`, `themeInverse`, or `$true`.
  - The repo has no Tamagui compiler plugin wired into Metro or Next, so the upgrade is runtime-only.
- **L3 — 2026-10-19, risk.** Risk: item 5 — a major UI dependency changes every screen; a visual regression can pass typecheck and unit tests. Mitigation: baseline screenshots, web e2e, and an emulator smoke test.
- **L4 — 2026-10-19, implementation.**
  - `packages/ui/src/player-card/player-card.tsx`: flat token props; `hoverStyle`/`pressStyle` folded into `bg="brandAccent hover:brandAccentHover press:brandAccentPress"`; primary buttons `size="lg"`; blocked button `size="md"` + `paddingInline={18}` + `fontSize="4" lineHeight="4"`; replaced removed `unstyled` with `variant="quiet"` plus explicit width/padding/border/minHeight/opacity reset; station label `width="100%" textAlign="center"`.
  - `packages/ui/src/player-landing/player-landing.tsx`, `station-sheet/station-sheet.tsx`, `i18n/locale-switcher.tsx`, `ads-carousel/ads-carousel.tsx`: sigils removed, interaction objects removed; sheet rows restored to the v2 44px height and 1px/18px padding; locale buttons keep the v2 28px height, 13px/400 label, 5px radius, and no disabled fade (`opacity={1}`).
  - Canonical config untouched: still `@tamagui/config/v5`.
- **L5 — 2026-10-19, verification.**
  - `pnpm typecheck`: 7/7 tasks successful.
  - `pnpm test`: 7 tasks successful; config 10/10, player 29/29, ui 84/84; web/mobile scaffold scripts.
  - `pnpm exec biome check .`: 102 files checked, no fixes.
  - `pnpm check:singletons`: 12 singletons, one physical copy each.
  - `pnpm --filter web build`: Next 16.4.2 compiled successfully; 5 static pages generated.
  - `E2E_PORT=3000 pnpm --filter web test:e2e`: 12/12 passed.
  - Screenshot comparison (`/tmp/opencode/tamagui3/baseline` vs `after4`, ImageMagick `compare -metric AE`): `playing-es-390` 0, `playing-en-390` 0, `playing-en-1440` 0, `blocked-es-390` 0.0758 (anti-aliasing), `sheet-es-390` 0.9137 (anti-aliasing). No visual delta accepted.
  - Android `emulator-5554`: rebuilt Metro with `EXPO_PUBLIC_STREAM_BASE_URL=http://10.0.2.2:3000`; landing rendered, autoplay reached Playing, Pause reached Paused, Resume reached Loading then Playing, station sheet opened, and selecting Test Jingle switched the dock. No JS errors in logcat.
- **L6 — 2026-10-19, caveats.**
  - Root `pnpm build` still fails at `desktop:build` because `tauri build` expects `apps/web/out` and the host lacks `net-libs/webkit-gtk:4.1`; this is environmental and outside S5. The required web build was run separately and passed. The failed run also rewrote `apps/desktop/src-tauri/Cargo.toml`; the unintended edit was reverted.
  - `pnpm peers check` still reports the pre-existing `@react-native/metro-config` 0.87.1 vs 0.88.0 mismatch (wanted by `@react-native/community-cli-plugin@0.88.0`); unchanged by this slice.
  - `expo install --check` still flags TypeScript 5.9.3 vs expected `~6.0.3`; deferred to its own slice.
- **L7 — 2026-10-19, commit.** Code, lockfile, and the initial feature document were committed as `b583c90` on `feature/tamagui-3`; no merge or push was performed.
