# Feature: monorepo-scaffold (Task 1)

## Objective

Create the pnpm monorepo scaffold for Aqui Suena: resolving workspaces, bootable web/native placeholders, shared aliases, Biome as lint/format.

## Problem / Why

Nothing can be built without the scaffold (Tasks 2+ depend on Task 1). The plan requires it as the first sequential step.

## Scope

- `package.json` (workspaces, build/test/lint/typecheck scripts), `pnpm-workspace.yaml`
- `biome.json` (lint+format, replaces ESLint/Prettier) + `lint` script
- `tsconfig.base.json` + per-app/per-package `tsconfig.json`, strict, `@aqui-suena/*` aliases
- `apps/web/app/page.tsx` placeholder (Next.js App Router + React Native Web)
- `apps/native/app/index.tsx` placeholder (Expo Router)
- Minimal `packages/*` so aliases resolve (e.g. `packages/config`, `packages/ui`)
- `git init` + feature branch (no git repo existed)

## Constraints

- pnpm (v12.4.1 installed), Node 22
- TypeScript strict
- Biome, no ESLint/Prettier
- No `next/link` in shared code (Solito rule, applies from Task 2 but must not be violated earlier)

## Tasks

- [x] T1.1 Root: package.json + pnpm-workspace.yaml + biome.json + tsconfigs (route: delegated)
- [x] T1.2 Bootable web/native app placeholders (route: delegated)
- [x] T1.3 Minimal packages + resolving `@aqui-suena/*` aliases (route: delegated)
- [x] T1.4 Verification: `pnpm -r build`, placeholders, `biome check .` (route: delegated)

## Authorized scope

User authorized the scaffold (Task 1). Only the files listed above. Push/PR/merge remain user decisions.

## Acceptance criteria (from tasks/todo.md Task 1)

- [x] `pnpm -r build` resolves all workspaces without errors
- [x] `apps/web` renders placeholder (verified in prerendered HTML) and `apps/native` structure ready + typecheck (Expo Go boot pending manual check)
- [x] Shared `@aqui-suena/*` aliases resolve from apps (web/native import `@aqui-suena/ui`, which imports `@aqui-suena/config`)

## Applicable checks

- `pnpm -r build`
- `pnpm exec biome check .`
- Manual: open web and native placeholders

## TDD

- Mode: off (scaffold has no logic; no runner configured yet). Source: no test runner in greenfield repo.
- Ordinary tests, no RED-GREEN-REFACTOR.

## Delivery

- Strategy: single-pr by default. Forecast < 400 authored lines.
- Work-unit commits per task on feature branch, Conventional Commits. No prior git repo: init + branch first.

## Route declaration

- Chosen route: delegated direct (single writer).
- Trigger evidence: 2+ non-trivial files (writer trigger); reading that prepares a write (preparation trigger). No SDD: small understood work, file count never selects SDD.

## Progress

- 2026-10-07: document created, 4 tasks. Next: delegate writer for T1.1-T1.4.
- 2026-10-07: T1.1-T1.4 completed on branch `feature/monorepo-scaffold`. Checks: `pnpm install` ok, `pnpm -r build` ok (4 workspaces), `pnpm -r typecheck` ok, `pnpm exec biome check .` exit 0 (21 files), `pnpm -r test -- --run` ok (placeholder scripts). Manual pending: open web placeholder in dev and boot native in Expo Go.
- Commits: f627393 (T1.1 root), 42e37a2 (T1.2 apps), 618c039 (T1.3 packages), T1.4 this commit.
- 2026-10-07: Task 1 checked off in tasks/plan.md and tasks/todo.md (commit b9012bd); native Expo Go boot left unchecked pending manual verification.
- 2026-10-07: document translated to English per user rule (all docs in English from now on).

## Decisions

- Biome replaces ESLint/Prettier (prior user decision, saved to memory).
- Docs convention: every document added or modified from now on is written in English.

## Conventions

- Documents: English. Direct chat replies keep following the active persona language.
