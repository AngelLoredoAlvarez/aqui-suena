# Feature: tdd-solid-base — Base TDD + guardias SOLID/Clean

## Objective
Montar base mínima TDD (Vitest) + ejemplo RED-GREEN en `packages/ui` + Husky pre-commit + dependency-cruiser con regla Clean Architecture.

## Problem
Hoy `pnpm test` / `turbo run test` son scaffold (`echo 'no tests yet'`). No hay runner, ni ejemplo, ni guardias de arquitectura. SOLID es voluntarismo.

## Why
Usuario pidió explícitamente ("si hazlo") montar lo propuesto: Vitest + ejemplo + Husky + dependency-cruiser.

## Scope
- `packages/ui`: Vitest config + 1 test ejemplo (greeting/SharedButton logic, sin web-only).
- Root: script `test` real vía turbo, config compartida vitest si hace falta.
- Husky + lint-staged: `biome check + tsc --noEmit + vitest run` pre-commit.
- dependency-cruiser: regla dominio no depende de app/framework (Next/Expo/Tamagui directo en ui solo vía primitivas permitidas).
- `turbo.json`: sacar `test dependsOn build` para loop TDD rápido (si no rompe nada).

Out of scope: Playwright E2E, MSW, coverage thresholds, CI workflow, push/PR/merge.

## Constraints
- Stack: pnpm 12.4.1, turbo 2.11.7, Next 16, Expo 57, React 19, Tamagui 2.7.7, TS strict (base strict:true).
- No push a remoto sin orden explícita. Commits locales en feature branch sí.
- No tocar `apps/web/next-env.d.ts` (dirty actual, generado).
- Generated files (lockfile, .next) excluidos del conteo de líneas autoradas.

## Authorized scope
Usuario: "si hazlo" sobre propuesta del turno anterior. Cubre archivos listados en Scope. No autoriza push ni PR.

## TDD mode
- Mode: ON. Source: explicit user request + test-driven-development skill. Runner: `vitest run` (a instalar), vía `pnpm --filter @aqui-suena/ui test` y `turbo run test -- --run`.
- RED antes de GREEN para el ejemplo. GREEN mínimo. REFACTOR con tests en verde.

## Delivery strategy
- Strategy: `ask-on-risk` (default). Forecast: ~150-220 líneas autoradas (excluye lockfile). Running count: 0.
- Si forecast/count supera ~400 autoradas, preguntar chain strategy antes del próximo commit.

## Tasks
- [x] T1 Vitest base en packages/ui (deps, config, script test real) — route: delegated-direct intent, fallback inline (Task runtime bloqueado: free-tier solo dentro de OpenCode)
- [x] T2 Ejemplo RED-GREEN (greeting.test.ts, 2 casos) — route: inline con TDD observado (characterization: GREEN de entrada, documentado en el archivo)
- [x] T3 Husky + lint-staged pre-commit (biome, typecheck, vitest) — route: inline (hook verificado: corrió real en cada commit)
- [x] T4 dependency-cruiser + regla Clean (dominio no depende de app) + script `arch` — route: inline (negativo probado con probe temporal)
- [x] T5 turbo.json test sin dependsOn build + verificación full (test, typecheck, lint) — route: inline

## Acceptance criteria
- `pnpm --filter @aqui-suena/ui test` corre Vitest y pasa en verde.
- `turbo run test` ya no es echo scaffold para ui.
- `git log` en feature branch muestra work-unit commits convencionales por tarea, con identidad registrada abajo.
- Husky hook existe y corre checks (verificado con archivo, no necesariamente con commit de prueba si ensucia).
- dependency-cruiser reporta OK en estado base.

## Applicable checks
- `pnpm --filter @aqui-suena/ui test` (vitest run)
- `pnpm --filter @aqui-suena/ui typecheck` / `tsc --noEmit`
- `pnpm lint` (biome check)
- `turbo run test -- --run` al cierre

## Progress
- 2026-10-08: feature doc creado. Explore directo (subagent explore bloqueado por free-tier runtime, se sigue inline).
- 2026-10-08: T1–T5 implementados y commiteados en `feat/tdd-solid-base`. Branch creada desde main.

## Verification evidence
- `pnpm --filter @aqui-suena/ui test` → 1 file, 2 tests passed (vitest 5.0.3).
- `turbo run test --force` → 5 tasks OK en 1.5s, sin builds (antes: ~14s con `next build`).
- `turbo run typecheck` → 5/5 paquetes OK.
- `pnpm exec biome check` sobre archivos nuevos → OK (1 formato auto-corregido en package.json).
- `pnpm arch` (depcruise) → no violations (22 módulos); probe temporal con import prohibido → 1 error detectado, probe eliminado.
- Hook `.husky/pre-commit` ejecutó lint-staged + typecheck + test en cada commit de la rama (observado en salida).
- RDD assess del slice → risk medium, review_due (slice_budget_reached, 785 líneas con lockfile). Consent otorgado por usuario. Lens review-reliability BLOQUEADO: Task runtime rechaza subagentes fuera de OpenCode (3 intentos). Sin captura, sin acknowledgement, lineage `review-2fae62cc5f764af5` preservado en estado reviewing para retomar dentro de OpenCode.

## Next step
- Revisar dentro de OpenCode (retoma lineage) o aceptar verificación funcional; luego PR a main (push/PR solo con orden explícita).

## Commits
- bb68c2b docs: add tdd-solid-base feature tracking
- d6be719 test(ui): add Vitest base with greeting characterization tests
- f9ab5b5 chore: add Husky pre-commit with lint-staged, typecheck and tests
- 3ac0aa6 chore: add dependency-cruiser with Clean Architecture layer rules
- 57fcf1d chore: decouple turbo test from build for fast TDD loop
