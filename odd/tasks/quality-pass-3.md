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

## Tasks

- T1 — S1: extract `splash-progress.ts` + `splash-progress.test.ts`. Route: inline. ✅ done
- T2 — S2: split the boot-splash into `bit.tsx`, `footer-mark.tsx`, `native-boot-splash.tsx`. Route: inline. ✅ done
- T3 — S3: split `invoices.ts` into lifecycle modules + barrel. Route: inline. ✅ done
- T4 — Close: typecheck, package tests, biome, `pnpm arch`; adjust the mobile
  coverage thresholds to the honest post-extraction baseline. ✅ done

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
