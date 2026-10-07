# Aquí Suena

Open-stream radio with autoplay plus local business discovery, by 17Labs. A Turborepo monorepo where Next.js (web) and Expo (native) share Tamagui UI and Solito routes from day one.

## Quick path

1. Install: `pnpm install` (requires Node 22, pnpm 12.4.1)
2. Run web: `pnpm dev:web` → http://localhost:3000/player
3. Run native: `pnpm dev:native` (Expo Go) or `pnpm dev:native:android` (emulator)
4. Verify: `pnpm -r build && pnpm -r typecheck && pnpm exec biome check .`

## Layout

| Path | What lives there |
|------|------------------|
| `apps/web` | Next.js 16 App Router + React Native Web |
| `apps/native` | Expo 57 + Expo Router |
| `packages/config` | Canonical `tamagui.config` (tokens, themes, fonts, media) |
| `packages/navigation` | Shared Solito route contracts (`/player`, `/player/[stationId]`) |
| `packages/ui` | Shared Tamagui provider + components (no `next/link`, no web-only CSS) |
| `packages/player`, `api`, `db` | Planned: playback core, tRPC status API, Drizzle schema |

## Scripts

| Command | Effect |
|---------|--------|
| `pnpm dev:web` | Web dev server |
| `pnpm dev:native` | Native via Expo Go |
| `pnpm dev:native:android` | Native on Android emulator |
| `pnpm build` / `test` / `typecheck` | Turbo pipelines across workspaces |
| `pnpm lint` | `biome check --write .` |

## Routes

Shared via Solito, same names on both platforms: `/player` and `/player/[stationId]`.

## Docs and planning

| Doc | Purpose |
|-----|---------|
| `tasks/plan.md` | Implementation plan and task list |
| `tasks/todo.md` | Task checkboxes and acceptance criteria |
| `SPEC-radio-playback.md` | MVP spec: autoplay, fallback, status |
| `CAPABILITY-MAP.md` | Module map |
| `odd/tasks/` | Per-task execution trackers |

## Status

Foundation in place (monorepo scaffold, Tamagui + Solito, `@aqui-suena/*` scope). Next: DB + tRPC status API (Task 3), then player core and autoplay integration.

## Conventions

- Documents in English; Biome for lint/format (no ESLint/Prettier).
- Conventional Commits on feature branches; push/PR/merge are maintainer decisions.
