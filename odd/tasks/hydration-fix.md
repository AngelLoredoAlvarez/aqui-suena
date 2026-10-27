# ODD — hydration-fix

## Objective

Eliminate the player landing hydration mismatch (`http://localhost:3000`), leaving the console clean and visuals identical.

## Problem

React reports `A tree hydrated but some attributes of the server rendered HTML didn't match`: the server paints "Cargando estado de la estación…" while the client paints "Reproduciendo" plus the card, with an additional diff of Tamagui atomic `className`s. There is also a double `favicon.ico` 404.

## Why

- Cause 1 (severe): `PlayerLanding` branches its render on client-only state (`usePlayer` with no `window.Audio` on the server + `useListenerStatus` with no SSR cache).
- Cause 2 (cosmetic): bare `TamaguiProvider` with no Next SSR integration; `next.config.ts` has no Tamagui plugin.
- Cause 3 (trivial): missing `favicon.ico`.

## Scope

- `packages/ui/src/player-landing.tsx` (mounted gate)
- `packages/ui/src/provider.tsx` + `apps/web/next.config.ts` (+ documented Tamagui dep if applicable)
- `apps/web/app/favicon.ico` (or `icon.tsx`)
- This document. Nothing else.

## Constraints

- Authorship rule #68 in force: the user writes everything by default; this run is an explicit handoff ("do it all yourself", 2026-10-09). Authorship returns to the user when this run closes.
- No `suppressHydrationWarning` as a band-aid. No `window`/`localStorage`/`Audio` reads during render.
- Identical visuals (night-plum card, amber button, copy). No behavior change except clean hydration.
- No push without explicit order. Commits without "Co-Authored-By" or AI attribution (Conventional Commits).
- TDD resolved: mode UNKNOWN (no `sdd-init` record for the project; searched 2026-10-09). Source: none. Runner: `pnpm --filter @aqui-suena/ui test` (vitest run). Ordinary functional checks run; no invented strict TDD.
- Artifact language: English for every agent-created document (rule #11), regardless of conversation language.

## Delivery

- Strategy: `ask-on-risk` (default). Forecast: <80 authored lines, well under the 400 budget. No slices, no chain.
- Single work-unit commit on `feat/player-visual-design` (already a feature branch). Limit: no PR in this run.

## Tasks

- [x] **H1** — Mounted gate in `PlayerLanding`: the first client render is identical to the server HTML (same loading fallback until `mounted`; no window/localStorage/Audio reads in render, no suppressHydrationWarning). Invariant test in `listener-status.test.tsx` (first paint with warm cache). Honest note: `usePlayer` starts at `idle` on both sides, so the gate is hardening, not the fix for the observed mismatch (see H2). Route: delegated (same writer).
- [x] **H2** — Documented Tamagui SSR integration verified via Context7 (official Next.js guide): `@tamagui/next-plugin` is webpack-only ("for projects not using Turbopack"), incompatible with our Turbopack/Next 16 setup → no plugin, no new dep. The documented alternative (transpilePackages + react-native→react-native-web resolveAlias) was already in `next.config.ts`. Real root finding: the mismatch was NOT a missing integration — it was stale SSR from the dev server (see evidence). Route: delegated (same writer).
- [x] **H3** — Favicon: multi-size `apps/web/app/favicon.ico` (16/32/48, night-plum + amber). `/favicon.ico` → 200, no 404. Route: delegated (same writer).
- [x] **H4** — Verification + work-unit commit + evidence in this doc. Route: delegated (same writer executes; parent does readback and spot check).

## Acceptance criteria

- Console free of hydration errors and 404s (React DevTools info and HMR log acceptable).
- `/api/stream` still 200 and the player looks the same (compare screenshot).
- `pnpm --filter @aqui-suena/ui typecheck`, `pnpm --filter @aqui-suena/ui test`, `pnpm --filter web typecheck` green.

## Applicable checks

- `pnpm --filter @aqui-suena/ui typecheck`
- `pnpm --filter @aqui-suena/ui test`
- `pnpm --filter web typecheck`
- Parent spot check in browser (snapshot + console + network).

## Progress

- 2026-10-09: full exploration (page, providers, player-landing, provider, player-card, tamagui.config, next.config). Causes confirmed. Doc created, Engram mirror saved.
- 2026-10-09 (writer): H1+H3 implemented; H2 verified against official docs. The original doc's cause 1 was refuted with evidence: with unmodified code, the stale server painted the SAME loading tree but with different atomic classes (`_col-color`, missing `_bg-brand1`) while the client resolved (`_col-brandCream`, `_bg-brand1`). A fresh production build (`pnpm build` + prerendered `index.html`) resolves brand tokens in SSR → the code was fine; the dev server (PID 117308, started 12:14, before the brand-tokens commit 17:31) served stale SSR. Clean restart + e2e 12/12 green.
- 2026-10-09 (parent): doc translated to English per artifact-language rule #11 (it was mistakenly created in Spanish); translation uncommitted.

## Verification evidence

- `pnpm --filter @aqui-suena/ui typecheck`: tsc --noEmit clean.
- `pnpm --filter @aqui-suena/ui test`: 7 files, 57 tests passed (incl. new first-paint-with-warm-cache invariant).
- `pnpm --filter web typecheck`: tsc --noEmit clean.
- `pnpm --filter web test:e2e` (fresh server, both chromium-es/en projects): 12 passed, 0 console errors (specs assert `errors == []`, covering hydration + 404).
- Before restart (stale server, E2E_PORT=3000): 10 failed with `A tree hydrated but some attributes...` on the SAME loading fallback — divergent Tamagui classes, not branch divergence.
- `curl /favicon.ico` → 200 (was 404). Fresh SSR contains `_bg-brand1` (was absent).
- Files: `packages/ui/src/player-landing.tsx`, `packages/ui/src/listener-status.test.tsx`, `apps/web/app/favicon.ico`, this doc. `provider.tsx`/`next.config.ts` unchanged (H2 verdict above).
- Work-unit commit: 06d5252 (branch `feat/player-visual-design`, no push).

## Next step

- Parent: readback + browser spot check (snapshot + console + network) against the fresh dev server on :3000. Authorship returns to the user when this run closes (rule #68).
