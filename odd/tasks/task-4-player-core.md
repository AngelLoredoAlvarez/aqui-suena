# Feature: task-4-player-core — Playback core, pair-programmed (TDD ping-pong)

## Objective

Implement Task 4 (player core: mirror fallback picker, media-error mapper, `usePlayer` autoplay hook) in `packages/player`, developed through a TDD ping-pong: the agent writes RED tests, GREEN implementations are written manually.

## Problem

No `packages/player` exists. Task 4 demands 100% coverage on the fallback picker + error mapper — pure logic, ideal for strict RED-GREEN-REFACTOR with implementations driven manually.

## Why

Scope: start Task 4 collaboratively instead of agent-only. Agreed model: the agent owns RED tests, GREEN code is written manually, reviewer-style feedback with technical WHY, work-unit commits each with own authorship.

## Scope

- Slices: (a) fallback picker `pickFallbackUrl` — manual implementation first; (b) error mapper `describeMediaError` — TBD owner; (c) `usePlayer` hook — TBD (together or agent).
- Agent prepares per slice: branch, package scaffold, RED test, handoff with exact commands.
- Slice code is implemented manually, gates run, work committed.
- Agent reviews the manual code (no silent rewrites), fixes only on explicit request.

Out of scope: Task 5+ UI, E2E, push/PR/merge.

## Constraints

- Stack: pnpm 12.4.1, turbo 2.11.7, TS strict 5.9.3 (pin exact in new packages — pnpm latest is TS7, which dropped `baseUrl`), Vitest 5.
- Branch `feat/task-4-player-core`; local commits only, no push.
- New package follows conventions: `build`/`typecheck` = `tsc --noEmit`, `test` = `vitest run`, tsconfig extending `tsconfig.base.json`.
- Pure logic first: no audio elements, no DOM, no platform APIs in slices (a) and (b).

## Authorized scope

Approved: the ping-pong model, with the exact commands to run handed off. Covers scaffold + RED tests by agent, implementation written manually. No push, no PR.

## TDD mode

- Mode: ON (strict). Source: explicit requirement + test-driven-development skill. Runner: `vitest run` via turbo; watch mode via `vitest` (no `run`) for the tight loop.
- Contract under test for slice (a): `pickFallbackUrl(triedUrls, candidates) => first untried candidate or null`.

## Delivery strategy

- Strategy: `ask-on-risk` (default). Forecast: small (~150 authored lines). Per-slice work-unit commits.

## Tasks

- [x] T1 Scaffold `packages/player` + RED tests for slice (a) fallback picker (agent)
- [x] T2 GREEN implementation of slice (a)
- [x] T3 Slice (b) error mapper: RED (agent) + GREEN
- [x] T4 Slice (c) `usePlayer`: RED (agent) + GREEN + senior hardening (agent, on request: run generations, asMediaFailure narrowing, stable play/resume, rotation test for non-object rejections)
- [x] T5 Full verification + close

## Acceptance criteria

- `pickFallbackUrl` + `describeMediaError` at 100% coverage of their branches.
- `turbo run test`, `turbo run typecheck`, `biome check .` green.
- Each slice committed separately with its author's hands on the implementation.

## Applicable checks

- `pnpm --filter @aqui-suena/player test` (single run) / `exec vitest` (watch)
- `pnpm --filter @aqui-suena/player typecheck`
- `turbo run test -- --run`, `turbo run typecheck`, `pnpm exec biome check .`

## Progress

- 2026-10-08: branch created from main (ca3cdb2). Model agreed.
- 2026-10-23: closed as OBSOLETE. The ping-pong model was superseded: the player
  core was completed agent-side and verified in Task 8 e2e (`odd/tasks/task-8-e2e.md`,
  commit `d596477`) — `packages/player` reaches 100% lines/statements/functions and
  90.69% branches, with `turbo run test` / `typecheck` / `biome check .` green.

## Verification evidence

- `pnpm --filter @aqui-suena/player exec vitest run --coverage` → lines 100% (78/78),
  statements 100% (81/81), functions 100% (15/15), branches 90.69% (39/43).

## Next step

- Done. Closed 2026-10-23 (superseded by Task 8; see `odd/tasks/task-8-e2e.md`).

## Commits

- Player core landed on main across the Task 4–8 slices; final coverage locked by
  `d596477` (Task 8 e2e).
