# Feature: player-landing (product change)

## Objective
Make `/` the player + ads-carousel view on web and native. Remove the separate `/player` route and screen on both platforms so the user hears and sees content immediately on app open, with no navigation step.

## Problem / Why
The Task 2 scaffold left `/` as a placeholder home and `/player` as a separate screen behind a navigation step. The product decision (user, 2026-10-08) is that the landing IS the player plus the ads carousel.

## Scope
- `packages/ui/src/player-landing.tsx` (new shared landing: player block reusing `SharedButton`, plus `AdsCarousel` placeholder for the future ads-display module, Tamagui primitives only)
- `packages/ui/src/ads-carousel.tsx` (new temporary placeholder, clearly marked)
- `packages/ui/src/index.ts` (barrel exports)
- `apps/web/app/page.tsx` (renders the shared landing; stays `use client` since it consumes Tamagui)
- `apps/native/app/index.tsx` (renders the shared landing; remove the `/player` Link)
- Delete `apps/web/app/player/page.tsx` and `apps/native/app/player.tsx`
- `packages/navigation` stays (route contracts return for Task 5 deep links) but must have zero usages in apps after this change
- Docs/rules: `SPEC-radio-playback.md` first-visit experience, `tasks/todo.md` Tasks 6-7 (forward-looking refs to `/player` become landing `/`), `AGENTS.md` short Product invariants section
- Do NOT rewrite Task 2 history in docs; do NOT touch review state (open lineage belongs to the parent)

## Constraints
- pnpm 12.4.1, Node 22, TypeScript strict
- Tamagui as only shared UI system; no raw `div` / web-only CSS in `packages/ui`; no `next/link` in `packages/*`
- Tamagui 2.7.7 v5 preset: only proven style props (`flex`, `items`, `justify`, `gap`, `p`, …); `bordered`, `borderRadius`, `borderWidth` are rejected by types
- Biome must stay green; build + typecheck must pass
- Do NOT push, PR, or merge

## Tasks
- [ ] L1 Shared landing + ads placeholder in `packages/ui` (route: delegated)
- [ ] L2 Web landing + delete `apps/web/app/player/page.tsx` (route: delegated)
- [ ] L3 Native landing + delete `apps/native/app/player.tsx` + remove Link (route: delegated)
- [ ] L4 Docs/rules updates (SPEC, todo 6-7, AGENTS.md invariants) (route: delegated)
- [ ] L5 Verification: build, typecheck, lint, route grep, manual `/` check (route: delegated)

## Authorized scope
User authorized the product change, the new branch, and the commits. Only the files above plus minimal wiring.

## Acceptance criteria
- [ ] `/` renders player + carousel placeholder on web and native from shared code
- [ ] No `/player` route remains on either platform (route grep clean, no dangling imports)
- [ ] Themes/tokens apply with no web-only CSS leak

## Applicable checks
- `pnpm -r build`
- `pnpm -r typecheck`
- `pnpm exec biome check .`
- `grep -rn "player" apps/*/app --include="*.tsx" -il` shows no `/player` page or link remains
- Manual: open `/` on web and native, same layout, player first

## TDD
- Mode: off (UI wiring, no test runner configured). Source: echo-placeholder tests only.
- Ordinary functional checks, not RED-GREEN-REFACTOR.

## Delivery
- Strategy: single-pr by default. Forecast < 400 authored lines (advisory only, not a cap).
- Work-unit commits on the new branch, Conventional Commits.
- Do NOT commit `.atl/` (gitignored) or `next-env.d.ts` churn.

## Route declaration
- Chosen route: delegated direct (single writer).
- Trigger evidence: 2+ non-trivial files (writer trigger). No SDD: small understood work, file count never selects SDD.

## Progress
- 2026-10-08: document created. Next: create branch, delegate writer for L1-L5.
