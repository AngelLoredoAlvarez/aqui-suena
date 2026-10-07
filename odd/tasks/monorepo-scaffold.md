# Feature: monorepo-scaffold (Task 1)

## Objective
Crear el scaffold del monorepo pnpm para Aqui Suena: workspaces que resuelven, placeholders web/native que bootean, aliases compartidos, Biome como lint/format.

## Problem / Why
Sin scaffold no se puede construir nada encima (Tasks 2+ dependen de Task 1). Plan lo exige como primer paso secuencial.

## Scope
- `package.json` (workspaces, scripts build/test/lint/typecheck), `pnpm-workspace.yaml`
- `biome.json` (lint+format, reemplaza ESLint/Prettier) + script `lint`
- `tsconfig.base.json` + `tsconfig.json` por app/package, strict, aliases `@aqui/*`
- `apps/web/app/page.tsx` placeholder (Next.js App Router + React Native Web)
- `apps/native/app/index.tsx` placeholder (Expo Router)
- `packages/*` minimos para que los aliases resuelvan (ej. `packages/config`, `packages/ui`)
- `git init` + rama feature (no hay repo git aun)

## Constraints
- pnpm (v12.4.1 instalado), Node 22
- TypeScript strict
- Biome, no ESLint/Prettier
- No `next/link` en codigo compartido (regla Solito, aplica desde Task 2 pero no violar desde ahora)

## Tasks
- [x] T1.1 Root: package.json + pnpm-workspace.yaml + biome.json + tsconfigs (route: delegated)
- [x] T1.2 Apps placeholders web/native que bootean (route: delegated)
- [x] T1.3 Packages minimos + aliases `@aqui/*` resolviendo (route: delegated)
- [x] T1.4 Verificacion: `pnpm -r build`, placeholders, `biome check .` (route: delegated)

## Authorized scope
Usuario autorizo scaffold (Task 1). Solo archivos listados arriba. Push/PR/merge quedan como decisiones del usuario.

## Acceptance criteria (de tasks/todo.md Task 1)
- [x] `pnpm -r build` resuelve todos los workspaces sin errores
- [x] `apps/web` renderiza placeholder (verificado en HTML prerenderizado) y `apps/native` estructura lista + typecheck (boot en Expo Go pendiente de chequeo manual)
- [x] Aliases `@aqui/*` resuelven desde apps (web/native importan `@aqui/ui`, que importa `@aqui/config`)

## Checks aplicables
- `pnpm -r build`
- `pnpm exec biome check .`
- Manual: abrir placeholder web y native

## TDD
- Modo: off (scaffold sin logica; sin runner configurado aun). Fuente: sin test runner en repo greenfield.
- Tests ordinarios, no RED-GREEN-REFACTOR.

## Delivery
- Estrategia: single-pr por defecto. Forecast < 400 lineas authored.
- Commits work-unit por tarea en rama feature, Conventional Commits. Sin git repo previo: init + branch primero.

## Route declaration
- Ruta elegida: delegated direct (writer unico).
- Evidencia de triggers: 2+ archivos no-triviales (writer trigger); lectura que prepara escritura (preparation trigger). No SDD: trabajo pequeno/entendido, file count no selecciona SDD.

## Progress
- 2026-10-07: documento creado, 4 tareas. Next: delegar writer T1.1-T1.4.
- 2026-10-07: T1.1-T1.4 completadas en rama `feature/monorepo-scaffold`. Checks: `pnpm install` ok, `pnpm -r build` ok (4 workspaces), `pnpm -r typecheck` ok, `pnpm exec biome check .` exit 0 (21 files), `pnpm -r test -- --run` ok (placeholder scripts). Pendiente manual: abrir placeholder web en dev y boot native en Expo Go.
- Commits: f627393 (T1.1 root), 42e37a2 (T1.2 apps), 618c039 (T1.3 packages), T1.4 este commit.

## Decisions
- Biome reemplaza ESLint/Prettier (decision previa del usuario, guardada en memoria).
