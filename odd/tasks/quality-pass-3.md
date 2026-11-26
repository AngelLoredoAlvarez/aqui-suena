# Quality pass 3: boot-splash extraction and invoice composition split

Objective: close the two remaining findings from the full monorepo re-scan —
the untested presentational boot-splash in `apps/mobile` and the oversized
`packages/api/src/server/composition/invoices.ts` composition root. Branch
`chore/quality-pass-3`. Delivery: `ask-on-risk`, one slice per task. Test
runner: Vitest (per package), `turbo run typecheck`, `pnpm build`.

## Specs

- S1 — The declarative interpolation ranges and equalizer-bar wiring currently
  inlined in `native-boot-splash.tsx` move to a pure, node-testable module with
  co-located tests. The duplicated arc/arcAlt ranges collapse to one constant.
  No visual behavior changes.
- S2 — `native-boot-splash.tsx` splits into one file per component (`bit.tsx`,
  `footer-mark.tsx`, `native-boot-splash.tsx`), each owning its own styles and
  animated-component bindings. No behavior change.
- S3 — `server/composition/invoices.ts` (373 lines) splits by billing lifecycle
  (config, issue, history, cancel, recover) behind a re-exporting barrel that
  preserves the public surface. Existing importers and `invoices.test.ts` stay
  green without changes.
- S4 — The boot-splash components gain a render test over a
  `react-native`/`react-native-svg` mock, raising the `apps/mobile` coverage
  baseline. `@testing-library/react-native` is added as a dev dependency; the
  render test uses `@testing-library/react` + jsdom because RNTL's own
  `render()` requires `react-native` to load under Node, which the vitest setup
  does not support (Flow syntax + native module mocks).

## Tasks

- T1 — S1: extract `splash-progress.ts` + `splash-progress.test.ts`. Route: inline. ✅ done — `2c99cec`
- T2 — S2: split the boot-splash into `bit.tsx`, `footer-mark.tsx`, `native-boot-splash.tsx`. Route: inline. ✅ done — `2c99cec`
- T3 — S3: split `invoices.ts` into lifecycle modules + barrel. Route: inline. ✅ done — `547b318`
- T4 — Close: typecheck, package tests, biome, `pnpm arch`; adjust the mobile
  coverage thresholds to the honest post-extraction baseline. ✅ done
- T5 — S4: add the boot-splash render test + react-native mock and the RNTL dev
  dependency; raise the mobile coverage thresholds. Route: inline. ✅ done

## Log

- L1 — Requirement: apply every remaining improvement from the re-scan (mobile
  boot-splash coverage/organization, invoice composition split) on a new branch.
  (2026-11-26)
- L2 — T1+T2: extracted the declarative interpolation ranges and equalizer
  zipping into `splash-progress.ts` (collapsing the duplicated arc/arcAlt
  ranges) and split `native-boot-splash.tsx` into `bit.tsx`, `footer-mark.tsx`
  and `native-boot-splash.tsx`, one component per file. Mobile typecheck clean,
  14 tests pass (3 new). Coverage moved from 39.55/47.61/38.46/39.53 to
  42.55/47.61/41.46/42.64; thresholds raised to the honest ~2-points-below
  baseline (40/45/39/40). (2026-11-26)
- L3 — T3: split `invoices.ts` (373 lines) into `invoice-config.ts`,
  `invoice-issue.ts`, `invoice-history.ts`, `invoice-cancel.ts` and
  `invoice-recover.ts`, with `invoices.ts` reduced to a re-exporting barrel
  that preserves the public surface. All importers (`worker-app.ts`,
  `env-mappers.ts`, `archive-recovery.ts`, `cancellation-sweep.ts`) and
  `invoices.test.ts` unchanged. (2026-11-26)
- L4 — T4: full typecheck 7/7, api 1424 / mobile 14 / ui / db / player / config
  / web tests green, biome clean, `pnpm arch` no violations. (2026-11-26)
- L5 — Review assessment (`--base-ref main --committed-only`): risk `medium`
  (`executable_change` in `bit.tsx`), `review_due: false`
  (`under_budget`). No native review triggered; the boundary stays at main.
  (2026-11-26)
- L6 — T5: added `@testing-library/react-native@14` + `test-renderer@1.3`
  (React 19.3 line) as dev deps and a `native-boot-splash.test.tsx` render test
  plus a `react-native`/`react-native-svg` mock in `test/setup.ts`. The render
  test runs with `@testing-library/react` + jsdom because RNTL's `render()`
  requires `react-native` to load in Node (Flow + native modules), which the
  vitest setup cannot provide without a jest-expo-equivalent Babel transform.
  Mobile coverage rose from 42.55/47.61/41.46/42.64 to 64.53/57.14/60.97/63.97;
  `components/` is now ~98% covered (only the two Expo Router entrypoints stay
  at 0%). Thresholds raised to 62/55/58/62. (2026-11-26)
