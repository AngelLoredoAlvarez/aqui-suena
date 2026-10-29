# Aquí Suena

Open-stream radio with autoplay plus local business discovery, by 17Labs. A Turborepo monorepo where Next.js (web), Expo (mobile), and Tauri (desktop) share one Tamagui UI and one playback core from day one.

## Quick path

1. Install: `pnpm install` (requires Node 22+, pnpm 12.14.0)
2. Run everything: `pnpm dev` → API on :3001, web on :3000, Metro on :8081 and the desktop window. Add `--android` to open mobile on an emulator. If any of those services is already running, `pnpm dev` reuses it instead of restarting it and keeps the rest of the group up (Ctrl-C stops only what this invocation started).
3. Run a single client: `pnpm dev:web`, `pnpm dev:mobile`, `pnpm dev:desktop` (this one starts its own web).
4. Verify: `pnpm build && pnpm typecheck && pnpm exec biome check .`

## Layout

| Path              | What lives there                                                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`        | Next.js 16 App Router + React Native Web                                                                                                                          |
| `apps/mobile`     | Expo SDK 58 + Expo Router                                                                                                                                         |
| `apps/desktop`    | Tauri shell that wraps the web static export                                                                                                                      |
| `packages/config` | Canonical `tamagui.config` (tokens, themes, fonts, media)                                                                                                         |
| `packages/ui`     | Shared Tamagui provider + components (player card, station selector, ads carousel, i18n, ts-pattern state helpers, jotai atoms) — no `next/link`, no web-only CSS |
| `packages/player` | Playback core (fallback picker, error mapper, `usePlayer`)                                                                                                        |
| `packages/api`    | tRPC contract (`listener.getStatus`) + Hono backend (Node + Cloudflare Worker) + `/stream` proxy                                                                  |
| `packages/db`     | Drizzle schema (SQLite/D1: `stations`, `listen_sessions`)                                                                                                         |

## Scripts

| Command                             | Effect                                                                                                                                                                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Everything: API on :3001, web on :3000, Metro on :8081 and the desktop window (`--android` opens the app on the emulator, `--emulator` only starts it). Reuses any service already listening on its port instead of restarting it. |
| `pnpm dev:web`                      | Web dev server                                                                                                                                                                                                                     |
| `pnpm dev:api`                      | API only, needed by web and desktop audio                                                                                                                                                                                          |
| `pnpm dev:desktop`                  | Desktop shell via Tauri dev (serves the web app on :3000)                                                                                                                                                                          |
| `pnpm dev:mobile`                   | Mobile via Expo Go                                                                                                                                                                                                                 |
| `pnpm dev:mobile:lan`               | Mobile via Expo Go with LAN IP injected (use when api/web already running)                                                                                                                                                         |
| `pnpm dev:mobile:android`           | Mobile on the Android emulator (boots an available AVD and opens the app; api/web must already be running)                                                                                                                         |
| `pnpm dev:mobile:build`             | Development build on the emulator, with lock-screen controls and background audio                                                                                                                                                  |
| `pnpm build:desktop:web`            | Static export of the web app for the Tauri bundle                                                                                                                                                                                  |
| `pnpm build:mobile:staging`         | Release Android APK pointing at the deployed backend (see `apps/mobile/STAGING.md`)                                                                                                                                                |
| `pnpm deploy:web`                   | Deploy the web static export to Cloudflare Pages                                                                                                                                                                                   |
| `pnpm --filter desktop build`       | Packaged desktop app (Tauri; builds that export first)                                                                                                                                                                             |
| `pnpm build` / `test` / `typecheck` | Turbo pipelines across workspaces                                                                                                                                                                                                  |
| `pnpm lint`                         | `biome check --write .`                                                                                                                                                                                                            |
| `pnpm arch`                         | Dependency-cruiser architecture check                                                                                                                                                                                              |

## Mobile playback

`pnpm dev` does not start the emulator by default. To boot an available
emulator and open the app on it, run `pnpm dev -- --android` (or
`pnpm dev -- --emulator` to boot one and leave the app closed). The emulator
is reused if already running.

When several AVDs are installed, set `ANDROID_AVD=<name>` to pick one; with a
single AVD it is detected automatically, so the command stays machine-agnostic.

`--android` also opens the app when Metro was already running and gets reused:
the script tunnels `:8081` with `adb reverse` and deep-links Expo Go at the
server, since the reused Expo process never received `--android` itself.

Expo Go runs `expo-audio` for foreground playback, but it ships its own fixed Android manifest and cannot declare the `AudioControlsService` that lock-screen controls and background audio need. The driver detects that case and skips lock-screen activation, so Expo Go never logs a service binding failure.

Those two features need a development build: `pnpm dev:mobile:build` installs the app with the `expo-audio` config plugin applied, which declares the service. It starts its own Metro, so stop `pnpm dev` first, or pass `--no-bundler` when Metro is already running.

## Desktop packaging

Tauri embeds a **static export** of `apps/web` (`apps/web/out`), built by `pnpm build:desktop:web`. A static bundle has no backend of its own, so:

- the stream proxy lives in `packages/api`; the web server build keeps `/api/stream` working with a rewrite to it (`API_ORIGIN`, default `http://localhost:3001`);
- the packaged app bakes an absolute API base at build time: `NEXT_PUBLIC_API_BASE_URL`. Unset, the build warns and falls back to `http://localhost:3001`, which is a development artifact, not a release.

Because the export cannot host dynamic route handlers, `apps/web/app/**/route.ts` files would break packaging: backend work belongs in `packages/api`.

Both the dashboard build and the export compile from `apps/web`, and Next takes an exclusive lock on `.next`, so `pnpm build` orders them: `desktop#build` waits for `web#build`. The export runs last, which leaves `.next` holding the static export; run `pnpm --filter web build` if you need the server build there.

## Deploys

| Target             | Command                                                     | Where                                                                         |
| ------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Web                | `NEXT_PUBLIC_API_BASE_URL=https://<worker> pnpm deploy:web` | Cloudflare Pages (`https://aqui-suena-web.pages.dev`)                         |
| API / stream proxy | `pnpm --filter @aqui-suena/api run deploy:worker`           | Cloudflare Worker (`https://aqui-suena-api.angel-loredo-alvarez.workers.dev`) |
| Mobile staging     | `pnpm build:mobile:staging`                                 | Local release APK; EAS builds Android + iOS in the cloud                      |

The web app builds as a static export with `NEXT_PUBLIC_API_BASE_URL` baked, so the browser calls the deployed Worker for audio. See `apps/web/DEPLOY.md`, `packages/api/DEPLOY.md`, and `apps/mobile/STAGING.md`.

## Routes

Landing `/` is the player + ads carousel on both platforms, rendered from shared code. There are no station screens by product decision: the player switches stations in place via its selector.

## Docs and planning

| Doc                      | Purpose                                                     |
| ------------------------ | ----------------------------------------------------------- |
| `tasks/plan.md`          | Implementation plan and task list                           |
| `tasks/todo.md`          | Task checkboxes and acceptance criteria                     |
| `SPEC-media-storage.md`  | Media storage: R2 upload + image optimization (free tier)   |
| `SPEC-notifications.md`  | Push notifications: web + mobile + desktop (free tier)      |
| `SPEC-offline.md`        | Offline/no-connection handling                              |
| `SPEC-radio-playback.md` | MVP spec: autoplay, fallback, status, test-stations harness |
| `CAPABILITY-MAP.md`      | Module map                                                  |
| `odd/tasks/`             | Per-task execution trackers                                 |
| `odd/tasks/backlog.md`   | Cross-feature TODO list                                     |

## Status

The radio-playback MVP is done and published to main (scaffold, UI foundation, status API mock, player core, PlayerCard, web + native autoplay, headed e2e, visual design). The stack now also matches the T4 Stack on `feature/t4-stack-parity` (Hono, Valibot, D1/SQLite, ts-pattern, jotai, Supabase; Million.js/PattyCake deferred — webpack-only, Turbopack-incompatible; revisit if compatible options emerge): branch has 8 commits, not yet merged. On `feature/ads-tiers-directory-schema`, T2 enforces three photos per Premium product, returns PRODUCT_PHOTO_QUOTA_EXCEEDED at the cap, and validates phone values as E.164 for calling and WhatsApp links; the branch is not yet merged or pushed. New features planned (specs created, implementation pending):

- Push notifications (SPEC-notifications.md): Web Push + Expo + Tauri, free tier.
- Offline/no-connection handling (SPEC-offline.md): player retry, TanStack Query offline cache, service worker.
- Cloudflare media storage (SPEC-media-storage.md): R2 upload + image optimization, free tier.
- Chatbot with Cloudflare Workers AI: update to SPEC-owner-portal (replaces Gemini).
- Image loading optimization for flyers: part of SPEC-media-storage.

Next, tracked in `odd/tasks/backlog.md` and the `free-test-stations` feature:

- Safe test-stations harness: 3 self-hosted dev channels + proof file — DONE (channels live in player-landing, SPEC + .gitignore in place).
- Desktop wide (1440) composition — DONE: from the `md` breakpoint up the landing uses the 1440px canvas with a header row and the player as a full-width bottom dock bar; the station selector sits below the status text, and web adds a 44px move button at the far right. The station selector becomes a 480px popover at the dock's right edge, with a pointer-transparent container so outside clicks close it. The same horizontal dock is used on mobile, tablet and web, with the design's 64px circular play button in primary/onPrimary colors. See `SPEC-radio-playback.md` (Responsive composition).
- Ads empty/countdown states, system-following themes, `ZStack` overlay cleanup.
- Windows/macOS signing and publishing (desktop stays dev-only until then).

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
- `pnpm exec infisical run -- pnpm dev` — run any command with secrets injected.

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

- `pnpm gitleaks:scan` — scan the whole git history
- `pnpm gitleaks:dir` — scan the working tree

Configuration lives in `.gitleaks.toml`; allowlist generated/vendored paths
there. Use `// gitleaks:allow` on a line to suppress a single false positive.
