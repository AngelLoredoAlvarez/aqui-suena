# Aquí Suena

Open-stream radio with autoplay plus local business discovery, by 17Labs. A Turborepo monorepo where Next.js (web) and Expo (mobile) share Tamagui UI and Solito routes from day one.

## Quick path

1. Install: `pnpm install` (requires Node 22, pnpm 12.4.1)
2. Run everything: `pnpm dev` → API on :3001, web on :3000, Metro on :8081 and the desktop window. Add `--android` to open mobile on a running emulator.
3. Run a single client: `pnpm dev:web`, `pnpm dev:mobile`, `pnpm dev:desktop` (this one starts its own web).
4. Verify: `pnpm -r build && pnpm -r typecheck && pnpm exec biome check .`

## Layout

| Path | What lives there |
|------|------------------|
| `apps/web` | Next.js 16 App Router + React Native Web |
| `apps/mobile` | Expo 57 + Expo Router |
| `packages/config` | Canonical `tamagui.config` (tokens, themes, fonts, media) |
| `packages/navigation` | Shared Solito route contracts (deep links return in Task 5) |
| `packages/ui` | Shared Tamagui provider + components (no `next/link`, no web-only CSS) |
| `packages/player`, `api`, `db` | Playback core (fallback picker, error mapper, `usePlayer`), shared tRPC contract and the HTTP server that deploys it, Drizzle schema |

## Scripts

| Command | Effect |
|---------|--------|
| `pnpm dev` | Everything: API on :3001, web on :3000, Metro on :8081 and the desktop window (`--android` opens the emulator build) |
| `pnpm dev:web` | Web dev server |
| `pnpm dev:api` | API only, needed by web and desktop audio |
| `pnpm dev:desktop` | Desktop shell via Tauri dev (serves the web app on :3000) |
| `pnpm dev:mobile` | Mobile via Expo Go |
| `pnpm dev:mobile:android` | Mobile on Android emulator |
| `pnpm build:desktop:web` | Static export of the web app for the Tauri bundle |
| `pnpm --filter desktop build` | Packaged desktop app (Tauri; builds that export first) |
| `pnpm build` / `test` / `typecheck` | Turbo pipelines across workspaces |
| `pnpm lint` | `biome check --write .` |

## Desktop packaging

Tauri embeds a **static export** of `apps/web` (`apps/web/out`), built by `pnpm build:desktop:web`. A static bundle has no backend of its own, so:

- the stream proxy lives in `packages/api`; the web server build keeps `/api/stream` working with a rewrite to it (`API_ORIGIN`, default `http://localhost:3001`);
- the packaged app bakes an absolute API base at build time: `NEXT_PUBLIC_API_BASE_URL`. Unset, the build warns and falls back to `http://localhost:3001`, which is a development artifact, not a release.

Because the export cannot host dynamic route handlers, `apps/web/app/**/route.ts` files would break packaging: backend work belongs in `packages/api`.

## Routes

Landing `/` is the player + ads carousel on both platforms, rendered from shared code. Station deep links return in Task 5.

## Docs and planning

| Doc | Purpose |
|-----|---------|
| `tasks/plan.md` | Implementation plan and task list |
| `tasks/todo.md` | Task checkboxes and acceptance criteria |
| `SPEC-radio-playback.md` | MVP spec: autoplay, fallback, status |
| `CAPABILITY-MAP.md` | Module map |
| `odd/tasks/` | Per-task execution trackers |

## Status

Tasks 1–4 done and published to main (scaffold, UI foundation, status API mock, player core). Next: Task 5 PlayerCard UI + deep links, then autoplay integration (Tasks 6–7).

## Conventions

- Documents in English; Biome for lint/format (no ESLint/Prettier).
- Conventional Commits on feature branches; push/PR/merge are maintainer decisions.
