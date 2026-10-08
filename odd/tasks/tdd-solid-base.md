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
- [ ] T1 Vitest base en packages/ui (deps, config, script test real) — route: delegated-direct (writer trigger: 2+ archivos no-triviales) — intento writer, fallback inline por límite runtime
- [ ] T2 Ejemplo RED-GREEN (greeting.test.ts, mínimo 1 caso) — route: inline con TDD observado
- [ ] T3 Husky + lint-staged pre-commit (biome, typecheck, vitest) — route: inline/fallback
- [ ] T4 dependency-cruiser + regla Clean (dominio no depende de app) + script — route: inline/fallback
- [ ] T5 turbo.json test sin dependsOn build + verificación full (test, typecheck, lint) — route: inline

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
- 2026-10-08: feature doc creado. Explore directo (subagent explore bloqueado por free-tier runtime, se sigue inline). Sin writes aún.

## Verification evidence
- (pendiente)

## Next step
- Crear branch `feat/tdd-solid-base` desde main y empezar T1.

## Commits
- (pendiente)
