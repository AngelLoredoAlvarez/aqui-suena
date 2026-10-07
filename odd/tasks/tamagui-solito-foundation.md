# Feature: tamagui-solito-foundation (Task 2)

## Objective
Set up canonical Tamagui config with providers in both apps, plus shared Solito route constants and empty `/player` route shells, so the same shared button renders on web and native.

## Problem / Why
Task 2 is the UI foundation for all playback UI (Tasks 4-7). Without shared tokens/themes and Solito routes, later work would diverge into web-only and native-only code.

## Scope
- `packages/config/tamagui.config.ts` (tokens, themes, fonts, media) + export from `@aqui-suena/config`
- `packages/navigation/*` (new workspace: shared route constants `/player`, `/player/[stationId]`, no `next/link` in shared code)
- `packages/ui/src/provider.tsx` + shared button (e.g. `SharedButton`) using Tamagui primitives only
- `apps/web/app/providers.tsx` + `apps/web/app/player/page.tsx` shell wired to Tamagui provider
- `apps/native/app/_layout.tsx` update + `apps/native/app/player.tsx` shell wired to Tamagui provider
- Deps pinned: `tamagui`, `@tamagui/config`, `solito`, `expo-router` compatible versions
- `pnpm-workspace.yaml` if new workspace added

## Constraints
- pnpm 12.4.1, Node 22, TypeScript strict
- Tamagui as only shared UI system; no raw `div` / web-only CSS in `packages/ui`
- Solito as only cross-platform navigation API in shared code
- Biome lint/format must stay green
- No `next/link` in `packages/*`

## Tasks
- [x] T2.1 Deps + config: install tamagui/solito pins, create `tamagui.config.ts` (route: delegated)
- [x] T2.2 Navigation + UI provider: `packages/navigation/routes.ts`, `packages/ui/src/provider.tsx` + shared button (route: delegated)
- [x] T2.3 App wiring + `/player` shells on web and native (route: delegated)
- [x] T2.4 Verification: `pnpm --filter ui test -- --run`, `pnpm -r build`, manual `/player` check (route: delegated)

## Authorized scope
User authorized Task 2 after verifying Task 1 web + native boot. Only files listed above plus minimal wiring (package.json, tsconfig, next.config, babel). Push/PR/merge remain user decisions.

## Acceptance criteria (from tasks/todo.md Task 2)
- [ ] Same Tamagui button renders on web and native from shared code
- [ ] `/player` resolves on web and native via Solito with no `next/link` in `packages/ui`
- [ ] Themes/tokens apply with no web-only CSS leak

## Applicable checks
- `pnpm --filter ui test -- --run`
- `pnpm -r build`
- `pnpm exec biome check .`
- Manual: open `/player` on web and native, same layout

## TDD
- Mode: off (foundation wiring, no logic runner yet; all package tests are echo placeholders). Source: no test runner configured in scaffold.
- Ordinary functional checks, not RED-GREEN-REFACTOR.

## Delivery
- Strategy: single-pr by default. Forecast < 400 authored lines (advisory only, not a cap).
- Work-unit commits per task on feature branch, Conventional Commits.
- Current branch `feature/monorepo-scaffold` has uncommitted `apps/web/next-env.d.ts` + untracked `.atl/`; writer must not commit those.

## Route declaration
- Chosen route: delegated direct (single writer).
- Trigger evidence: 2+ non-trivial files (writer trigger); reading that prepares a write (preparation trigger). No SDD: small understood work, file count never selects SDD.

## Progress
- 2026-10-07: document created, 4 tasks. Next: delegate writer for T2.1-T2.4.
- 2026-10-07: T2.1-T2.4 implemented on branch `feature/tamagui-solito-foundation` (commits 9dafea2, ee5b08f, ef25c8c, 5282786). Parent spot check: `biome check .` 33 files exit 0, `pnpm -r typecheck` clean. Native review medium/slice_budget_reached, consent granted, START created (lineage review-5f443cb8a369d433), reliability lens unavailable in this runtime (free-tier execution block) — recorded as unavailable, no PASS invented. Manual `/player` check pending user.
