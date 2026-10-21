# API server — a real HTTP backend for web, desktop and mobile

Branch: `feature/api-server` · Delivery: `ask-on-risk` · Runner: `pnpm test` (vitest, node env)
Objective: turn the tRPC router that already lives in `packages/api` into a deployable HTTP server (`apps/api`) that the three clients can call, with an origin policy that matches each platform.

## Specs

- **S1 — Deployable server.** `apps/api` is a standalone Node process that mounts the existing `appRouter` from `@aqui-suena/api/router` under `/trpc` via `@trpc/server/adapters/node-http`. The router is not duplicated: the server imports it.
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
- **S10 — Runtime.** `tsx` runs the TypeScript sources in dev and production (`dev`, `start`); `tsc --noEmit` typechecks; `vitest` runs the tests. No build artifact is required to deploy, matching how the workspace already consumes `.ts` sources.
- **S11 — Architecture rules stay honest.** The dependency-cruiser rule `client-never-imports-server-entry` keeps clients on `@aqui-suena/api/client`, and gains an explicit exception for `apps/api`, which is the server and must import `@aqui-suena/api/router`.
- **S12 — Documented client contract.** `apps/api/README.md` states the base-URL contract per platform (web same-origin, desktop absolute URL, mobile `EXPO_PUBLIC_*` baked at bundle time) and the security rule that DB credentials and LLM keys live on the server, never in a distributed binary.
- **S13 — Scope boundary.** This slice delivers the server and proves the three origin shapes. Rewiring the player from mock data to real HTTP calls, auth, the database, image optimization and the chatbot are later slices; none of them is blocked by this one.

## Tasks

- [x] T1 — `env.ts` + `cors.ts` as pure functions, tests first (S2–S5, S9).
- [x] T2 — `server.ts` with routing, the tRPC mount and a contract test through a real `@trpc/client` link (S1, S7, S8).
- [x] T3 — stream route with an injected upstream fetch (S6).
- [x] T4 — `main.ts`, package/turbo wiring, tsconfig and vitest config (S9, S10).
- [x] T5 — dependency-cruiser exception, root script, README (S11, S12).
- [x] T6 — full verification: tests, typecheck, lint, arch, and the three-origin smoke.

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
