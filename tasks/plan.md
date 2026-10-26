# Implementation Plan: radio-playback (MVP)

## Overview

Build the first vertical slice of aqui-suena: open the app and hear the temporary open stream with autoplay from the landing `/` (player + ads carousel, shared Tamagui UI, no station screens by product decision), tRPC status, and automatic mirror fallback. Later modules (business-directory, ads-display) reuse this shell.

## Architecture Decisions

- Monorepo with pnpm workspaces + Turborepo task orchestration (`turbo.json` pipeline with `dependsOn` ordering and local cache): `apps/web` (Next.js App Router), `apps/mobile` (Expo Router), `apps/desktop` (Tauri), `packages/player|ui|api|db|config`.
- No navigation package exists by product decision: the player switches stations in place on the landing `/`, with no station screens. Navigation (and the reserved `packages/navigation`) is deferred until a future module needs route screens; Solito is not installed.
- Tamagui as the only shared UI system (primitives + tokens + themes); `tamagui.config` canonical in `packages/config`.
- Playback core isolated in `packages/player`: fallback picker, error mapper (incl. `NotAllowedError` → `blocked`), `usePlayer({ autoplay: true })` with an injected `AudioDriver`. Driver implementation is `expo-audio` (cross-platform web + native, replaces deprecated `expo-av`); the hook never touches audio APIs directly.
- tRPC + TanStack Query for `listener.getStatus` mock; Drizzle + PostgreSQL for `stations` / `listen_sessions` metadata only.

## Task List

### Phase 1: Foundation

- [x] Task 1: Monorepo scaffold
- [x] Task 2: Tamagui + Solito foundation
- [x] Task 3: DB + tRPC status API

### Checkpoint: Foundation

- [x] Tests pass, builds clean

### Phase 2: Core playback

- [x] Task 4: Player core (fallback + autoplay)
- [x] Task 5: PlayerCard UI (Tamagui + Solito)
- [x] Task 6: Web autoplay integration
- [x] Task 7: Native autoplay integration

### Checkpoint: Core Features

- [x] End-to-end autoplay flow works on web (headed) + native

### Phase 3: Verification

- [x] Task 8: Verification + headed e2e

### Checkpoint: Complete

- [x] All SPEC-radio-playback.md success criteria met
- [x] Ready for review

Tasks tracked in `tasks/todo.md`.

## Risks and Mitigations

| Risk                                       | Impact | Mitigation                                                                                          |
| ------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------- |
| Browser audible-autoplay block             | High   | Audible-first attempt, `NotAllowedError` → `blocked` + one-tap resume; headed e2e covers both paths |
| Open-stream 403s (SomaFM-like UA blocking) | High   | mirror fallback chain + local proxy for e2e; never single URL                                       |
| Expo Router / Tamagui version drift        | Med    | Pin majors in MVP, upgrade only via Ask-first                                                       |
| expo-audio background limits               | Med    | MVP validates background no-crash; track-player decision stays open                                 |

## Open Questions

- Temporary stream chain + local proxy choice
- Live metadata vs "Live" label
- expo-audio vs track-player for background
- Expo Router / Tamagui version pins, Tamagui compiler + fonts

## Parallelization Opportunities

- Safe to parallelize: Task 3 (DB/API) with Task 2 (UI foundation) after Task 1
- Must be sequential: Task 1 → all; Task 4 → Tasks 5-7; Task 8 last
