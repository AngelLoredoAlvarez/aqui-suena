# Feature: tdd-solid-base — TDD base + SOLID/Clean guards

## Objective
Set up a minimal TDD base (Vitest) + RED-GREEN example in `packages/ui` + Husky pre-commit + dependency-cruiser with a Clean Architecture rule.

## Problem
`pnpm test` / `turbo run test` are scaffolds today (`echo 'no tests yet'`). No runner, no example, no architecture guards. SOLID is voluntary.

## Why
User explicitly requested ("si hazlo") to set up what was proposed: Vitest + example + Husky + dependency-cruiser.

## Scope
- `packages/ui`: Vitest config + 1 example test (greeting/SharedButton logic, no web-only APIs).
- Root: real `test` script via turbo, shared vitest config if needed.
- Husky + lint-staged: `biome check + tsc --noEmit + vitest run` pre-commit.
- dependency-cruiser: domain-must-not-depend-on-app/framework rule (Next/Expo/Tamagui direct usage in ui only through allowed primitives).
- `turbo.json`: drop `test dependsOn build` for a fast TDD loop (if nothing breaks).

Out of scope: Playwright E2E, MSW, coverage thresholds, CI workflow, push/PR/merge.

## Constraints
- Stack: pnpm 12.4.1, turbo 2.11.7, Next 16, Expo 57, React 19, Tamagui 2.7.7, TS strict (base strict:true).
- No push to any remote without an explicit order. Local commits on the feature branch are allowed.
- Do not touch `apps/web/next-env.d.ts` (generated, was dirty at start).
- Generated files (lockfile, .next) are excluded from the authored-line count.

## Authorized scope
User: "si hazlo" on the previous turn's proposal. Covers the files listed in Scope. Does not authorize push or PR.

## TDD mode
- Mode: ON. Source: explicit user request + test-driven-development skill. Runner: `vitest run` (to be installed), via `pnpm --filter @aqui-suena/ui test` and `turbo run test -- --run`.
- RED before GREEN for the example. Minimal GREEN. REFACTOR with tests green.

## Delivery strategy
- Strategy: `ask-on-risk` (default). Forecast: ~150-220 authored lines (lockfile excluded). Running count: 0.
- If forecast/count exceeds ~400 authored lines, ask for the chain strategy before the next commit.

## Tasks
- [x] T1 Vitest base in packages/ui (deps, config, real test script) — route: delegated-direct intent, inline fallback (Task runtime blocked: free-tier only inside OpenCode)
- [x] T2 RED-GREEN example (greeting.test.ts, 2 cases) — route: inline with observed TDD (characterization: GREEN on first run, documented in the file)
- [x] T3 Husky + lint-staged pre-commit (biome, typecheck, vitest) — route: inline (hook verified: actually ran on every commit)
- [x] T4 dependency-cruiser + Clean rule (domain must not depend on app) + `arch` script — route: inline (negative case proven with a temporary probe)
- [x] T5 turbo.json test without dependsOn build + full verification (test, typecheck, lint) — route: inline

## Acceptance criteria
- `pnpm --filter @aqui-suena/ui test` runs Vitest and passes green.
- `turbo run test` is no longer an echo scaffold for ui.
- `git log` on the feature branch shows conventional work-unit commits per task, with identities recorded below.
- Husky hook exists and runs checks (verified from hook output, no throwaway test commit needed).
- dependency-cruiser reports OK on the base state.

## Applicable checks
- `pnpm --filter @aqui-suena/ui test` (vitest run)
- `pnpm --filter @aqui-suena/ui typecheck` / `tsc --noEmit`
- `pnpm lint` (biome check)
- `turbo run test -- --run` at close

## Progress
- 2026-10-08: feature doc created. Direct exploration (explore subagent blocked by free-tier runtime, continued inline).
- 2026-10-08: T1–T5 implemented and committed on `feat/tdd-solid-base`. Branch created from main.
- 2026-10-08: doc translated to English per the artifact-language rule (was Spanish, my mistake).

## Verification evidence
- `pnpm --filter @aqui-suena/ui test` → 1 file, 2 tests passed (vitest 5.0.3).
- `turbo run test --force` → 5 tasks OK in 1.5s, no builds (before: ~14s with `next build`).
- `turbo run typecheck` → 5/5 packages OK.
- `pnpm exec biome check` on new files → OK (1 auto-fixed format in package.json).
- `pnpm arch` (depcruise) → no violations (22 modules); temporary probe with a forbidden import → 1 error detected, probe removed.
- `.husky/pre-commit` hook ran lint-staged + typecheck + test on every branch commit (observed in output).
- RDD slice assess → risk medium, review_due (slice_budget_reached, 785 lines including lockfile). Consent granted by user. review-reliability lens BLOCKED: Task runtime rejects subagents outside OpenCode (3 attempts). No capture, no acknowledgement; lineage `review-2fae62cc5f764af5` preserved in reviewing state to resume inside OpenCode.

## Next step
- Review inside OpenCode (resume lineage) or accept functional verification; then PR to main (push/PR only on explicit order).

## Commits
- bb68c2b docs: add tdd-solid-base feature tracking
- d6be719 test(ui): add Vitest base with greeting characterization tests
- f9ab5b5 chore: add Husky pre-commit with lint-staged, typecheck and tests
- 3ac0aa6 chore: add dependency-cruiser with Clean Architecture layer rules
- 57fcf1d chore: decouple turbo test from build for fast TDD loop
