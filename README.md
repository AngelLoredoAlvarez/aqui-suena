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
| `pnpm dev:mobile:build` | Development build on the emulator, with lock-screen controls and background audio |
| `pnpm build:desktop:web` | Static export of the web app for the Tauri bundle |
| `pnpm --filter desktop build` | Packaged desktop app (Tauri; builds that export first) |
| `pnpm build` / `test` / `typecheck` | Turbo pipelines across workspaces |
| `pnpm lint` | `biome check --write .` |

## Mobile playback

Expo Go runs `expo-audio` for foreground playback, but it ships its own fixed Android manifest and cannot declare the `AudioControlsService` that lock-screen controls and background audio need. The driver detects that case and skips lock-screen activation, so Expo Go never logs a service binding failure.

Those two features need a development build: `pnpm dev:mobile:build` installs the app with the `expo-audio` config plugin applied, which declares the service. It starts its own Metro, so stop `pnpm dev` first, or pass `--no-bundler` when Metro is already running.

## Desktop packaging

Tauri embeds a **static export** of `apps/web` (`apps/web/out`), built by `pnpm build:desktop:web`. A static bundle has no backend of its own, so:

- the stream proxy lives in `packages/api`; the web server build keeps `/api/stream` working with a rewrite to it (`API_ORIGIN`, default `http://localhost:3001`);
- the packaged app bakes an absolute API base at build time: `NEXT_PUBLIC_API_BASE_URL`. Unset, the build warns and falls back to `http://localhost:3001`, which is a development artifact, not a release.

Because the export cannot host dynamic route handlers, `apps/web/app/**/route.ts` files would break packaging: backend work belongs in `packages/api`.

Both the dashboard build and the export compile from `apps/web`, and Next takes an exclusive lock on `.next`, so `pnpm build` orders them: `desktop#build` waits for `web#build`. The export runs last, which leaves `.next` holding the static export; run `pnpm --filter web build` if you need the server build there.

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

### Environment variables (Varlock + Infisical)

`.env.schema` is the single source of truth for environment variables (types,
required/optional, defaults). Secrets live in Infisical and are injected at
runtime with `infisical run -- <command>`; no `.env` files are committed
(`.env*` is gitignored, except `.env.schema` and `.env.example`).

- `pnpm varlock:load` — resolve and validate the current environment.
- `pnpm varlock:audit` — check that schema and code references agree.
- `pnpm varlock:codegen` — regenerate the auto-generated `env.d.ts` types.
- `infisical run -- pnpm dev` — run any command with secrets injected.

### Secret scanning (gitleaks)

`gitleaks` scans commits and the working tree for leaked credentials. The
pre-commit hook runs it on staged changes when the binary is installed; CI
(`.github/workflows/gitleaks.yml`) enforces it on every push and pull request.

Install the binary (not an npm package):

- macOS: `brew install gitleaks`
- Linux: download the latest release from
  https://github.com/gitleaks/gitleaks/releases, or
  `go install github.com/zricethezav/gitleaks/v8@latest` (add `~/go/bin` to
  `PATH`).
- Windows: `scoop install gitleaks` or `choco install gitleaks`.

Run manually:

- `pnpm gitleaks` — scan staged changes (pre-commit mode)
- `pnpm gitleaks:scan` — scan the whole git history
- `pnpm gitleaks:dir` — scan the working tree

Configuration lives in `.gitleaks.toml`; allowlist generated/vendored paths
there. Use `// gitleaks:allow` on a line to suppress a single false positive.
