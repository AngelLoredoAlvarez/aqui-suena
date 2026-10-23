# Feature: scope-rename (chore)

## Objective
Rename the package scope from the legacy short scope to `@aqui-suena/*` across code, config, and docs so the shared packages are recognizable as Aqui Suena packages.

## Problem / Why
The legacy short scope was terse but opaque to outsiders. The user chose the explicit `@aqui-suena` scope for consistency with the app slug (`aqui-suena`).

## Scope
- `packages/*/package.json` (`name` fields: config, navigation, ui)
- Workspace deps (`workspace:*` entries) in `apps/web`, `apps/native`, `packages/ui`
- `tsconfig.base.json` path aliases
- `apps/web/next.config.ts` `transpilePackages`
- All source imports (`@aqui-suena/config`, `@aqui-suena/navigation`, `@aqui-suena/ui`)
- Doc references (`tasks/todo.md`, `SPEC-*.md`, `odd/tasks/*.md`, `tasks/plan.md` where they name the scope)
- `pnpm-lock.yaml` via `pnpm install` regen (never hand-edited)

## Constraints
- No behavior change: pure rename, no logic edits
- pnpm 12.4.1, Node 22
- Biome must stay green; build + typecheck must pass
- Do NOT push, PR, or merge. Do NOT touch playback/DB/API logic.

## Tasks
- [x] R1 Rename scope in manifests, aliases, configs, imports (route: delegated)
- [x] R2 Regen lockfile + verification (`pnpm install`, `pnpm -r build`, `pnpm -r typecheck`, `biome check`) (route: delegated)

## Authorized scope
User authorized the rename to `@aqui-suena` and the commits. Only the rename above.

## Acceptance criteria
- [x] Zero remaining legacy-scope references outside git history (grep clean)
- [x] `pnpm -r build` and `pnpm -r typecheck` pass
- [x] `pnpm exec biome check .` passes

## Applicable checks
- `grep -rn for the legacy scope prefix across .ts/.tsx/.json in apps, packages, and tsconfig.base.json` returns nothing (excluding lockfile regen noise and git history)
- `pnpm install`
- `pnpm -r build`
- `pnpm -r typecheck`
- `pnpm exec biome check .`

## TDD
- Mode: off (mechanical rename, no logic). Source: no test runner configured.
- Ordinary functional checks, not RED-GREEN-REFACTOR.

## Delivery
- Strategy: single-pr by default. Forecast < 400 authored lines (advisory only, not a cap).
- Work-unit commits on the current branch (`feature/tamagui-solito-foundation`), Conventional Commits.
- Do NOT commit `.atl/` (gitignored) or `next-env.d.ts` churn unless required by build.

## Route declaration
- Chosen route: delegated direct (single writer).
- Trigger evidence: 2+ non-trivial files (writer trigger). No SDD: small understood work, file count never selects SDD.

## Progress
- 2026-10-07: document created. Next: delegate writer for R1-R2.
- 2026-10-07: R1-R2 completed (commits 17c4f17 code+lockfile, 7c294b8 docs). Parent spot check: grep `@aqui/` clean (exit 1), `biome check .` 33 files exit 0. Writer gates: install/build/typecheck/biome all pass.
- 2026-10-23: CLOSED. All acceptance criteria met (ticked). Scope rename shipped; no legacy-scope references remain.
