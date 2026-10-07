# Implementation Plan: radio-playback (MVP)

## Overview
Build the first vertical slice of aqui_suena: open the app and hear the temporary open stream with autoplay, shared Tamagui UI, Solito `/player` routes on web (Next.js) and native (Expo), tRPC status, and automatic mirror fallback. Later modules (business-directory, ads-display) reuse this shell.

## Architecture Decisions
- Monorepo with pnpm workspaces + Turborepo task orchestration (`turbo.json` pipeline with `dependsOn` ordering and local cache): `apps/web` (Next.js App Router), `apps/native` (Expo Router), `packages/player|ui|navigation|api|db|config`.
- Solito as the only cross-platform navigation API; route names shared (`/player`, `/player/[stationId]`); no `next/link` in shared code.
- Tamagui as the only shared UI system (primitives + tokens + themes); `tamagui.config` canonical in `packages/config`.
- Playback core isolated in `packages/player`: fallback picker, error mapper (incl. `NotAllowedError` → `blocked`), `usePlayer({ autoplay: true })`. Web uses HTMLAudio, native uses `expo-av`.
- tRPC + TanStack Query for `listener.getStatus` mock; Drizzle + PostgreSQL for `stations` / `listen_sessions` metadata only.

## Task List

### Phase 1: Foundation
- [x] Task 1: Monorepo scaffold
- [ ] Task 2: Tamagui + Solito foundation
- [ ] Task 3: DB + tRPC status API

### Checkpoint: Foundation
- [ ] Tests pass, builds clean

### Phase 2: Core playback
- [ ] Task 4: Player core (fallback + autoplay)
- [ ] Task 5: PlayerCard UI (Tamagui + Solito)
- [ ] Task 6: Web autoplay integration
- [ ] Task 7: Native autoplay integration

### Checkpoint: Core Features
- [ ] End-to-end autoplay flow works on web (headed) + native

### Phase 3: Verification
- [ ] Task 8: Verification + headed e2e

### Checkpoint: Complete
- [ ] All SPEC-radio-playback.md success criteria met
- [ ] Ready for review

Tasks tracked in `tasks/todo.md`.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Browser audible-autoplay block | High | Audible-first attempt, `NotAllowedError` → `blocked` + one-tap resume; headed e2e covers both paths |
| Open-stream 403s (SomaFM-like UA blocking) | High | ice1→ice2→ice3 fallback chain + local proxy for e2e; never single URL |
| Solito / Expo Router / Tamagui version drift | Med | Pin majors in MVP, upgrade only via Ask-first |
| expo-av background limits | Med | MVP validates background no-crash; track-player decision stays open |

## Open Questions
- Temporary stream chain + local proxy choice
- Live metadata vs "Live" label
- expo-av vs track-player for background
- Solito / Expo Router / Tamagui version pins, Tamagui compiler + fonts

## Parallelization Opportunities
- Safe to parallelize: Task 3 (DB/API) with Task 2 (UI foundation) after Task 1
- Must be sequential: Task 1 → all; Task 4 → Tasks 5-7; Task 8 last
