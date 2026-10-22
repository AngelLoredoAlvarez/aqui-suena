# Feature: deps-typescript — TypeScript 6 + patch/minor dependency bumps

Branch: `chore/deps-typescript` · Delivery: `ask-on-risk` · Runner: `pnpm test` (vitest, node env) + `pnpm typecheck`

Objective: migrate TypeScript from 5.9.3 to 6.0.3 (the SDK 58 expected line) and apply the
patch/minor dependency bumps already scheduled in the backlog, without changing runtime behavior.

## Specs

- **S1 — TypeScript 6.0.3.** `typescript` is pinned to exact `6.0.3` in the root and in every
  package that pins it (apps/mobile, apps/web, packages/api, packages/config, packages/db,
  packages/player, packages/ui). `pnpm typecheck` passes for all packages.
- **S2 — Patch bumps.** The catalog and manifests move `react` and `react-dom` to `19.3.1`,
  `@tanstack/react-query` to `5.104.5`, `@tauri-apps/api` (web) and `@tauri-apps/cli` (desktop)
  to `2.12.4`, `turbo` (root) to `2.11.10`, and `dependency-cruiser` (root) to `18.7.0`.
  `pnpm check:singletons` stays green (one physical copy per singleton).
- **S3 — Tamagui minor.** `tamagui` (catalog) and `@tamagui/config` (packages/config) move from
  `3.0.18` to `3.1.2`. Config tests and UI tests stay green; no token or theme value changes.
- **S4 — No regressions.** `pnpm typecheck`, `pnpm test`, `pnpm exec biome check .`,
  `pnpm check:singletons`, and the web `next build` all pass. Existing e2e specs (web) pass.

## Tasks

- [x] T1 — Bump TypeScript to 6.0.3 across all packages, run typecheck, fix any breaks (S1).
- [x] T2 — Apply patch bumps (react, react-dom, react-query, tauri, turbo, dependency-cruiser) (S2).
- [x] T3 — Apply Tamagui minor bump and verify config/UI tests (S3).
- [ ] T4 — Full verification (typecheck, test, biome, singletons, web build, e2e) + close (S4).

## Log

- **L1 — 2026-10-22, user request (verbatim):**
  > no, vamos con lo de las dependencias y el typescript, abre una nueva rama de git y ahi lo vemos

- **L2 — 2026-10-22, decision (verbatim answer to the target-line question).**
  > 6.0.3 (Recomendado)

- **L3 — 2026-10-22, scope decision.** This branch takes TypeScript (6.0.3) plus the scheduled
  patch bumps and the Tamagui minor. Deferred to separate slices: `@react-native-async-storage/async-storage`
  2.2.0→3.1.1 (major, native runtime, needs device verification), `react-native-gesture-handler`
  3.3.0→3.4.0 (native minor), `@types/node` (stays at 24.x: the 26 line is ahead of the Node 24 runtime),
  and `@biomejs/biome` 2.5.15→2.6.2 (linter/format upgrade kept out of a migration diff).

- **L4 — 2026-10-22, exploration (read-only).** `tsconfig.base.json` uses `baseUrl: "."` + `paths`
  for `@aqui-suena/*`; every package extends it. `baseUrl` is deprecated in TS 6.0 but still
  functional (removed only in TS 7.0). Fresh `pnpm outdated -r` confirms the bump targets above;
  `@types/react`/`@types/react-dom` at 19.3.0 have no newer patch, so they stay.

- **L5 — 2026-10-22, implementation (T1).** `typescript` pinned to exact `6.0.3` in all 8 manifests
  (root + 7 packages). TS 6.0 turned `baseUrl` from a warning into error `TS5101`; the clean fix was
  to remove `baseUrl: "."` and make every `paths` entry relative (`./packages/…`) so `@aqui-suena/*`
  still resolves from the repo root (equivalent behavior since TS 4.1). No source code changed.

- **L6 — 2026-10-22, verification (T1).**
  - `pnpm typecheck`: 7/7 tasks successful.
  - `pnpm test`: 7/7 tasks (singletons + vitest; player 66, ui 90, …).
  - `pnpm --filter web build`: Next 16.4.2 compiled successfully, 4 static pages.
  - `pnpm exec biome check .`: 1 pre-existing error in `scripts/dev.mjs` (byte-identical to `main`,
    not touched by this slice) — left as out-of-scope debt.

- **L7 — 2026-10-22, risk.** Risk: item 5 — a toolchain/dependency major bump touches every package;
  mitigated by typecheck + full test suite + web build. Commit recorded below.

- **L8 — 2026-10-22, implementation (T2).** Patch bumps applied: `react`/`react-dom` 19.3.1 (catalog),
  `@tanstack/react-query` 5.104.5 (catalog), `@tauri-apps/api` 2.12.4 (web), `@tauri-apps/cli` 2.12.4
  (desktop), `turbo` 2.11.10 and `dependency-cruiser` 18.7.0 (root). `@types/react`/`@types/react-dom`
  stay at 19.3.0 (no newer patch). No source code changed.

- **L9 — 2026-10-22, verification (T2).**
  - `pnpm typecheck`: 7/7 tasks successful.
  - `pnpm test`: 7/7 tasks (config 10, api 52, player 66, db 2, ui 90).
  - `pnpm check:singletons`: 12 singletons, one physical copy each.
  - `pnpm arch`: no violations (101 modules).
  - `pnpm --filter web build`: compiled successfully.
  - `pnpm peers check`: only the pre-existing `@react-native/metro-config` 0.87.1 vs 0.88.0 mismatch
    (unchanged, backlog `Verification gaps`).

- **L10 — 2026-10-22, note.** The `minimumReleaseAgeExclude` list in `pnpm-workspace.yaml` still
  carries `turbo@2.11.9`/`@turbo/*@2.11.9`; `turbo` 2.11.10 installed without needing a new exclusion,
  so those entries are now stale but inert. Left untouched to keep the diff focused.

- **L11 — 2026-10-22, implementation (T3).** Tamagui 3.0.18 → 3.1.2 (catalog) and `@tamagui/config`
  3.0.18 → 3.1.2 (packages/config). This minor is NOT inert: Tamagui 3.1 removes the longhand of any
  style prop that has a shorthand in the active config (v5 → `@tamagui/shorthands/v4`), and TypeScript
  surfaces the failures one prop at a time. The repo was already shorthand-migrated except for three
  longhands in `packages/ui/src/player-card/player-card.tsx`, which were converted to their v4
  shorthands (note: v4 shorthands are full words, not the v3 terse set):
  `justifyContent` → `justify`, `textAlign` → `text`, `minHeight` → `minH`.

- **L12 — 2026-10-22, verification (T3).**
  - `pnpm typecheck`: 7/7 tasks successful.
  - `pnpm test`: 7/7 tasks (config 10, api 52, player 66, db 2, ui 90).
  - `pnpm check:singletons`: 12 singletons, one physical copy each.
  - `pnpm --filter web build`: compiled successfully.
  - `E2E_PORT=3000 pnpm --filter web test:e2e`: 12/12 passed (chromium-es + chromium-en).

- **L13 — 2026-10-22, risk.** Risk: item 5 (dependency minor touching the shared UI framework) +
  item 6 (a visual regression would not be caught by unit tests alone) — mitigated by config token
  assertions, RTL rendering tests, and the headed-capable web e2e suite. Commit recorded below.
