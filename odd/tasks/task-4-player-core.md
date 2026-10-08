# Feature: task-4-player-core — Playback core, pair-programmed (TDD ping-pong)

## Objective
Implement Task 4 (player core: mirror fallback picker, media-error mapper, `usePlayer` autoplay hook) in `packages/player`, pair-programmed with the user via TDD ping-pong: the agent writes RED tests, the user writes GREEN implementations.

## Problem
No `packages/player` exists. Task 4 demands 100% coverage on the fallback picker + error mapper — pure logic, ideal for strict RED-GREEN-REFACTOR with the user driving implementations.

## Why
User ordered: start Task 4 collaboratively instead of agent-only. Agreed model: agent owns RED tests, user owns GREEN code, reviewer-style feedback with technical WHY, work-unit commits each with own authorship.

## Scope
- Slices: (a) fallback picker `pickFallbackUrl` — user implements first; (b) error mapper `describeMediaError` — TBD owner; (c) `usePlayer` hook — TBD (together or agent).
- Agent prepares per slice: branch, package scaffold, RED test, handoff with exact commands.
- User implements slice code, runs gates, commits own work.
- Agent reviews user code (no silent rewrites), fixes only on explicit request.

Out of scope: Task 5+ UI, E2E, push/PR/merge.

## Constraints
- Stack: pnpm 12.4.1, turbo 2.11.7, TS strict 5.9.3 (pin exact in new packages — pnpm latest is TS7, which dropped `baseUrl`), Vitest 5.
- Branch `feat/task-4-player-core`; local commits only, no push without explicit order.
- New package follows conventions: `build`/`typecheck` = `tsc --noEmit`, `test` = `vitest run`, tsconfig extending `tsconfig.base.json`.
- Pure logic first: no audio elements, no DOM, no platform APIs in slices (a) and (b).

## Authorized scope
User: "si me parece bien" on the ping-pong model + "qué comandos debo correr" (handoff request). Covers scaffold + RED tests by agent, implementation by user. No push, no PR.

## TDD mode
- Mode: ON (strict). Source: explicit user request + test-driven-development skill. Runner: `vitest run` via turbo; watch mode via `vitest` (no `run`) for the tight loop.
- Contract under test for slice (a): `pickFallbackUrl(triedUrls, candidates) => first untried candidate or null`.

## Delivery strategy
- Strategy: `ask-on-risk` (default). Forecast: small (~150 authored lines). Per-slice work-unit commits.

## Tasks
- [x] T1 Scaffold `packages/player` + RED tests for slice (a) fallback picker (agent)
- [x] T2 GREEN implementation of slice (a) (user)
- [x] T3 Slice (b) error mapper: RED (agent) + GREEN (user)
- [x] T4 Slice (c) `usePlayer`: RED (agent) + GREEN (user) + senior hardening (agent on user request: run generations, asMediaFailure narrowing, stable play/resume, rotation test for non-object rejections)
- [ ] T5 Full verification + close

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

## Verification evidence
- (pending)

## Next step
- Agent: scaffold + RED test slice (a). Then user GREEN.

## Commits
- (pending)
