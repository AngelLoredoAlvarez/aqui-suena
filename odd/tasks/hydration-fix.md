# ODD — hydration-fix

## Objective

Eliminar el hydration mismatch del landing del player (`http://localhost:3000`) dejando la consola limpia y el visual idéntico.

## Problem

React reporta `A tree hydrated but some attributes of the server rendered HTML didn't match`: el server pinta "Cargando estado de la estación…" y el cliente pinta "Reproduciendo" + card, más diff de `className` atómicas de Tamagui. Además hay 404 doble de `favicon.ico`.

## Why

- Causa 1 (grave): `PlayerLanding` ramifica el render con estado solo-cliente (`usePlayer` sin `window.Audio` en server + `useListenerStatus` sin caché en SSR).
- Causa 2 (cosmética): `TamaguiProvider` pelado sin integración SSR de Next; `next.config.ts` no tiene plugin de Tamagui.
- Causa 3 (trivial): falta `favicon.ico`.

## Scope

- `packages/ui/src/player-landing.tsx` (gate de montado)
- `packages/ui/src/provider.tsx` + `apps/web/next.config.ts` (+ dep documentada de Tamagui si aplica)
- `apps/web/app/favicon.ico` (o `icon.tsx`)
- Este documento. Nada más.

## Constraints

- Regla de autoría #68 vigente: el usuario escribe todo por defecto; esta corrida es handoff explícito ("hazlo todo tu", 2026-10-09). Al terminar, la autoría vuelve al usuario.
- Sin `suppressHydrationWarning` como curita. Sin lecturas de `window`/`localStorage`/`Audio` durante el render.
- Visual idéntico (card night-plum, botón ámbar, copy). Sin cambio de comportamiento salvo hidratación limpia.
- Sin push sin orden explícita. Commits sin "Co-Authored-By" ni atribución a IA (Conventional Commits).
- TDD resuelto: modo UNKNOWN (no hay registro `sdd-init` para el proyecto; buscado 2026-10-09). Fuente: ninguna. Runner: `pnpm --filter @aqui-suena/ui test` (vitest run). Se corren checks funcionales ordinarios, no TDD estricto inventado.

## Delivery

- Estrategia: `ask-on-risk` (default). Pronóstico: <80 líneas autoradas, muy bajo el presupuesto de 400. Sin slices, sin chain.
- Un solo work-unit commit sobre `feat/player-visual-design` (ya es feature branch). Límite: sin PR en esta corrida.

## Tasks

- [x] **H1** — Gate de montado en `PlayerLanding`: el primer render del cliente es idéntico al HTML del server (mismo fallback de loading hasta `mounted`; sin lecturas window/localStorage/Audio en render, sin suppressHydrationWarning). Test invariante en `listener-status.test.tsx` (first paint con caché tibia). Nota honesta: `usePlayer` inicia en `idle` en ambos lados, por lo que el gate es endurecimiento, no el fix del mismatch observado (ver H2). Ruta: delegated (mismo writer).
- [x] **H2** — Integración SSR documentada de Tamagui verificada vía Context7 (guía oficial Next.js): `@tamagui/next-plugin` es solo-webpack ("for projects not using Turbopack"), incompatible con nuestro setup Turbopack/Next 16 → sin plugin, sin dep nueva. La alternativa documentada (transpilePackages + resolveAlias react-native→react-native-web) ya estaba en `next.config.ts`. Hallazgo raíz real: el mismatch NO era falta de integración — era SSR rancia del dev server (ver evidencia). Ruta: delegated (mismo writer).
- [x] **H3** — Favicon: `apps/web/app/favicon.ico` multi-tamaño (16/32/48, night-plum + ámbar). `/favicon.ico` → 200, sin 404. Ruta: delegated (mismo writer).
- [x] **H4** — Verificación + work-unit commit + evidencia en este doc. Ruta: delegated (mismo writer ejecuta, padre hace readback y spot check).

## Acceptance criteria

- Consola sin errores de hidratación ni 404 (info de React DevTools y log HMR son aceptables).
- `/api/stream` sigue 200 y el player se ve igual (comparar screenshot).
- `pnpm --filter @aqui-suena/ui typecheck`, `pnpm --filter @aqui-suena/ui test`, `pnpm --filter web typecheck` en verde.

## Applicable checks

- `pnpm --filter @aqui-suena/ui typecheck`
- `pnpm --filter @aqui-suena/ui test`
- `pnpm --filter web typecheck`
- Spot check del padre en navegador (snapshot + consola + red).

## Progress

- 2026-10-09: exploración completa (page, providers, player-landing, provider, player-card, tamagui.config, next.config). Causas confirmadas. Doc creado, espejo Engram pendiente.
- 2026-10-09 (writer): H1+H3 implementados; H2 verificado contra docs oficiales. Causa 1 del doc original refutada con evidencia: con código sin modificar, el server rancio pintaba el MISMO árbol de loading pero con clases atómicas distintas (`_col-color`, sin `_bg-brand1`) mientras el cliente resolvía (`_col-brandCream`, `_bg-brand1`). Build fresco de producción (`pnpm build` + `index.html` prerenderizado) resuelve brand en SSR → el código estaba bien; el dev server (PID 117308, arrancado 12:14, antes del commit de brand tokens 17:31) servía SSR rancio. Reinicio limpio + e2e 12/12 verde.

## Verification evidence

- `pnpm --filter @aqui-suena/ui typecheck`: tsc --noEmit limpio.
- `pnpm --filter @aqui-suena/ui test`: 7 files, 57 tests passed (incl. nuevo invariante de first-paint con caché tibia).
- `pnpm --filter web typecheck`: tsc --noEmit limpio.
- `pnpm --filter web test:e2e` (servidor fresco, ambos proyectos chromium-es/en): 12 passed, 0 console errors (los specs asertan `errors == []`, cubriendo hydration + 404).
- Antes del reinicio (servidor rancio, E2E_PORT=3000): 10 failed con `A tree hydrated but some attributes...` sobre el MISMO fallback de loading — clases Tamagui divergentes, no divergencia de ramas.
- `curl /favicon.ico` → 200 (antes 404). SSR fresco contiene `_bg-brand1` (antes ausente).
- Archivos: `packages/ui/src/player-landing.tsx`, `packages/ui/src/listener-status.test.tsx`, `apps/web/app/favicon.ico`, este doc. `provider.tsx`/`next.config.ts` sin cambios (veredicto H2 documentado arriba).
- Work-unit commit: 544d5bd (rama `feat/player-visual-design`, sin push).

## Next step

- Padre: readback + spot check en navegador (snapshot + consola + red) contra el dev server fresco en :3000. Autoría devuelta al usuario al cierre de esta corrida (regla #68).
