# API server — a real HTTP backend for web, desktop and mobile

Branch: `feature/api-server` · Delivery: `ask-on-risk` · Runner: `pnpm test` (vitest, node env)
Objective: turn the tRPC router that already lives in `packages/api` into the deployable HTTP backend for the three clients — one package that is both the contract and the node process, following the T4 stack, with an origin policy that matches each platform.

## Specs

- **S1 — Deployable server.** `packages/api` is both the shared contract and the deployable process: `src/main.ts` boots it and `src/server.ts` mounts the existing `appRouter` from `./router` under `/trpc` via `@trpc/server/adapters/node-http`. There is exactly one thing called `api` in the repo, and it is a package, matching the T4 stack. The router is not duplicated: the server imports it.
- **S2 — Origin policy per platform.** CORS accepts the three client origins and nothing else:
  - web dev: `http://localhost:3000`
  - desktop (Linux/macOS, Tauri custom protocol): `tauri://localhost`
  - desktop (Windows, Tauri on WebView2): `http://tauri.localhost`
  Extra origins come from `ALLOWED_ORIGINS` (comma-separated), so production web domains need no code change.
- **S3 — Mobile has no origin.** A request with **no** `Origin` header is allowed: React Native's fetch sends none, and rejecting it would break Android/iOS. CORS is a browser mechanism, not an authentication boundary.
- **S4 — Deny explicit strangers.** A request whose `Origin` header is present but not allowlisted gets `403` and no CORS headers.
- **S5 — Preflight.** `OPTIONS` for an allowed origin returns `204` with `Access-Control-Allow-Origin: <origin>`, `Access-Control-Allow-Methods: GET,POST,OPTIONS`, `Access-Control-Allow-Headers: content-type,authorization` and `Access-Control-Max-Age`. For a foreign origin it returns `403`. Every response carries `Vary: Origin`.
- **S6 — Stream route.** `GET /stream?url=` delegates to `fetchProxiedStream` from `@aqui-suena/api/client` and applies the same origin policy, so audio can be proxied from the desktop and mobile clients, not only same-origin web.
- **S7 — Health.** `GET /health` returns `200` with `{"status":"ok"}` for deploy checks.
- **S8 — Unknown paths.** Anything else returns `404`.
- **S9 — Configuration.** `PORT` (default `3001`), `HOST` (default `0.0.0.0`) and `ALLOWED_ORIGINS` are read from the environment; the parsing is a pure function so it is testable.
- **S10 — Runtime.** `tsx` runs the TypeScript sources in dev and production (`dev`, `start`); `tsc --noEmit` typechecks; `vitest` runs the tests. No build artifact is required to deploy, matching how the workspace already consumes `.ts` sources. `tsx` is a **runtime** dependency, not a dev one: a production install without devDependencies still has to boot.
- **S11 — Architecture rules stay honest.** The dependency-cruiser rule `client-never-imports-server-entry` keeps clients on the client-safe entries (`@aqui-suena/api/client`, `@aqui-suena/api/listener`) and needs no exemption, because the server now lives beside them in the same package. Server files (`server.ts`, `cors.ts`, `env.ts`, `main.ts`) are therefore never re-exported from `src/index.ts`: that would pull `node:http` into the web and mobile bundles.
- **S12 — Documented client contract.** `packages/api/README.md` states the base-URL contract per platform (web same-origin, desktop absolute URL, mobile `EXPO_PUBLIC_*` baked at bundle time), the shared-versus-server file split, and the security rule that DB credentials and LLM keys live on the server, never in a distributed binary.
- **S13 — Scope boundary.** This slice delivers the server and proves the three origin shapes. Rewiring the player from mock data to real HTTP calls, auth, the database, image optimization and the chatbot are later slices; none of them is blocked by this one.

## Tasks

- [x] T1 — `env.ts` + `cors.ts` as pure functions, tests first (S2–S5, S9).
- [x] T2 — `server.ts` with routing, the tRPC mount and a contract test through a real `@trpc/client` link (S1, S7, S8).
- [x] T3 — stream route with an injected upstream fetch (S6).
- [x] T4 — `main.ts`, package scripts, tsconfig and vitest config (S9, S10).
- [x] T5 — dependency-cruiser rule, root script, README (S11, S12).
- [x] T6 — full verification: tests, typecheck, lint, arch, and the three-origin smoke.
- [x] T7 — restructure to the T4 layout: move the server into `packages/api`, delete `apps/api` (S1, S10, S11, S12).

## Log

- **L1 — 2026-10-21, user request (verbatim):**
  > si, vamos por app/api, para que funcione correcto en las tres plataformas, crea la nueva rama donde trabajaremos eso, y puedes borrar las ramas locales que ya hayan sido mergeadas a main
- **L2 — 2026-10-21, branch and cleanup.** `feature/api-server` created from `main` (`9672d90`). `feature/tray-menu` and `fix/close-to-tray-hardening` deleted with `git branch -d` after `git branch --merged main` confirmed both.
- **L3 — 2026-10-21, runtime probe.** `node --experimental-strip-types -e "import('@aqui-suena/api/router')"` from `packages/ui` failed with `ERR_MODULE_NOT_FOUND`: Node's ESM resolver needs explicit extensions, and the workspace sources import siblings without them (`./routers/listener`). Rewriting every package import to `.ts` to satisfy Node would leak into Next and vitest. Chose `tsx` (`4.23.15`, already present in the store) as the runtime for `dev` and `start`, with `tsc --noEmit` as the typecheck gate.
- **L4 — 2026-10-21, defaults.** `PORT` defaults to `3001` because Next owns `3000`; `HOST` defaults to `0.0.0.0` because container platforms reach the process over the container network, not loopback.
- **L5 — 2026-10-21, RED then GREEN.** Tests written before the modules existed: `3 failed (3), Tests no tests` (`Cannot find module './cors'`). After `cors.ts`, `env.ts`, `server.ts`: `Test Files 3 passed (3), Tests 29 passed (29)`.
- **L6 — 2026-10-21, typecheck friction.** `Readable.fromWeb(proxied.body)` failed with `TS2345` while the app inherited the base `DOM` lib: the DOM `ReadableStream` lacks `values`/`Symbol.asyncIterator`. Dropped `DOM` from `apps/api` (`"lib": ["ES2022"]`, `"types": ["node"]`) so `Response`/`ReadableStream` come from `@types/node`/undici, which is also the honest typing for a server. `tsc --noEmit` then passed.
- **L7 — 2026-10-21, live smoke on port 3999.** `/health` → `200` + `vary: Origin`; with `Origin: tauri://localhost` → `200` + echoed `access-control-allow-origin`; `Origin: http://evil.example` → `403`; `/trpc/listener.getStatus?input=…` → `{"result":{"data":{"station":{"id":"abc",…},"listeners":42}}}`; `/stream` without `url` → `400`; a non-allowlisted stream host → `403`. `depcruise` reported `no dependency violations found (103 modules)`.
- **L8 — 2026-10-21, the architecture guard still bites.** The `client-never-imports-server-entry` exception could silently become too broad, so it was checked differentially: a temporary `apps/web/app/depcruise-probe.ts` importing `@aqui-suena/api/router` produced `error client-never-imports-server-entry: apps/web/app/depcruise-probe.ts → packages/api/src/router.ts`, and removing the probe returned to `no dependency violations found`. The probe was never committed.
- **L9 — 2026-10-21, first commit.** `ecab491 feat(api): add a deployable HTTP server for the shared tRPC router`. Assess: `risk: medium` (`executable_change` on `.dependency-cruiser.cjs`), `review_due: false`, reason `under_budget`, so no review opened and the boundary stayed pending in the slice.
- **L10 — 2026-10-21, user correction (verbatim):**
  > agregaste el package api al directorio apps, pero quedo api en packages, cual es la diferencia entre esos directorios y porque existen 2 nombrados igual
- **L11 — 2026-10-21, checked against the inspiration.** The T4 stack repo `timothymiller/t4-app` has `apps/{next,expo}` and `packages/{api,app,ui}` — **no `apps/api`**. `packages/api` (`@t4/api`) runs `wrangler dev` and `wrangler deploy --minify src/worker.ts`, and `src/worker.ts` is the Hono + `@hono/trpc-server` server with its own CORS from `APP_URL`. Root script: `"api": "cd packages/api && bun dev"`. No app depends on `@t4/api`; only `packages/ui` does. Conclusion: in the inspired convention there is exactly one `api`, it lives in `packages/`, and it deploys itself. The collision was ours.
- **L12 — 2026-10-21, user decision (verbatim):**
  > hazlo como lo maneja T4, asi, si nos surgen mas dudas, podemos investigar en ese proyecto
- **L13 — 2026-10-21, restructure.** `apps/api` deleted; `main.ts`, `cors.ts`, `env.ts`, `server.ts` and their three test files moved into `packages/api/src`, with the imports rewritten to siblings (`./client`, `./router`) and the README moved to `packages/api/README.md`. `packages/api/tsconfig.json` gained `types: ["node"]` and dropped `DOM` (the same `Readable.fromWeb` reason as L6). Scripts `dev`/`start` moved into the package. The dependency-cruiser exemption was removed: the rule now protects the client subpaths with no exception, and `src/index.ts` carries a comment forbidding server re-exports. Root script is now `pnpm --filter @aqui-suena/api dev`. Evidence: `packages/api` = **52 tests** (23 + the 29 moved), suite `7 successful, 7 total`, typecheck `7/7`, biome clean, `depcruise` clean at `102 modules`.
- **L14 — 2026-10-21, a false pass caught in this slice.** The first smoke after the restructure printed correct responses on port 3999, but the log opened with `EADDRINUSE`: an orphaned `tsx` child from the earlier smoke still held the port, so the answers came from a process running the deleted `apps/api` code, not the new one. `pkill -f "tsx src/main.ts"` had killed the pnpm wrapper without its child. Killed the listener by PID, confirmed the port free, re-ran: the log then showed `api: listening on http://0.0.0.0:3999`, and `/health` → `200` (no origin), `tauri://localhost` → `200` + echoed header, `http://tauri.localhost` → `200`, `http://evil.example` → `403`, preflight → `204`, `/trpc/…` → `listeners: 42`, `/stream` → `400`/`403`, unknown path → `404`.
- **L15 — 2026-10-21, guard re-checked after the move.** With the server now inside `packages/api`, a temporary client importing the safe entry (`@aqui-suena/api/client`) passed, while importing the package root (`@aqui-suena/api`) produced `error client-never-imports-server-entry: apps/web/app/depcruise-probe.ts → packages/api/src/index.ts`. Both probes deleted; the tree is clean.
