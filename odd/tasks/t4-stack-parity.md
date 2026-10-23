# Feature: t4-stack-parity

Branch: `feature/t4-stack-parity` · Delivery: `ask-on-risk` · Runner: `pnpm test` (vitest) + `pnpm typecheck`

Bring the stack in line with the T4 Stack (create-t4-app / t4stack.com), keeping pnpm as the package manager and NOT re-adding Solito (product decision: no station screens, `packages/navigation` stays reserved).

## Specs

S1 (Hono backend). Replace the plain Node `http` / fetch-handler backend in
    `packages/api` with Hono. Same routes (`/health`, `/stream`, `/trpc/*`),
    same CORS policy, same client-safe `./client` split. Keep pnpm; keep tRPC.

S2 (Valibot). Replace zod with Valibot for the listener input/output schemas
    in `packages/api` (tRPC `.input`/`.output` and the client fetcher). Same
    shapes and validation semantics; no runtime behavior change.

S3 (D1/SQLite). Replace the PostgreSQL Drizzle schema (`pg-core`) with SQLite
    (`sqlite-core`, D1-compatible). Same tables (`stations`, `listen_sessions`).
    `drizzle.config.ts` switches to the SQLite dialect. No live DB exists yet,
    so this is a schema/dialect change, not a data migration.

S4 (ts-pattern). Add `ts-pattern` and use it for the data-fetching UI states
    (loading/error/success) instead of ad-hoc ternaries.

S5 (Jotai). Add `jotai` for client-side global state (selected station / dock
    position), alongside TanStack Query (server state stays in Query).

S6 (Million.js). Add Million.js compiler to the Next.js web build.

S7 (PattyCake). Add PattyCake zero-runtime pattern matching, paired with
    ts-pattern.

S8 (Supabase Auth). Add Supabase auth client + cross-platform scaffolding
    (client + SSR helper), groundwork for the owner-portal module.

## Tasks

- [x] T1 — Hono backend (S1). Rewrite app/server/worker around Hono; keep tests green.
- [x] T2 — Valibot (S2). Swap zod→valibot in listener/router/client; keep tests green.
- [x] T3 — D1/SQLite schema (S3). pg-core→sqlite-core + drizzle.config dialect.
- [x] T4 — ts-pattern (S4). Add dep + migrate fetching states in packages/ui.
- [x] T5 — Jotai (S5). Add dep + minimal store(s).
- [ ] T6 — Million.js (S6). Next.js compiler config. BLOCKED: webpack-only, incompatible with Turbopack/Next 16 + React 19.
- [ ] T7 — PattyCake (S7). Compiler config paired with ts-pattern. BLOCKED: same webpack/Turbopack issue.
- [x] T8 — Supabase Auth (S8). Client + SSR scaffold.

## Log

L1 (2026-10-23, user): "ya merge y hice el push a main, ahora, en una nueva rama de git aplica las tecnologias que falta para que este proyecto haga match con el proyecto de T4 App"
L2 (2026-10-23, user, scope answer): "manten pnpm e ignora solito, lo demas si debe de quedar igual"
L3 (2026-10-23): T3 D1/SQLite done (commit cbbad2b): schema.ts → sqlite-core, drizzle.config → sqlite + d1-http. T2 Valibot done (commit 27d5d9d): valibot 1.5.0, zod removed, tRPC v11 accepts Valibot via Standard Schema (~standard). 52 api + 2 db tests green.
L4 (2026-10-23): T1 Hono done (commit 14ff38d): hono 4.13.13 + @hono/node-server (createAdaptorServer) + @hono/trpc-server; CORS applied post-next on c.res. T4 ts-pattern (5.9.2) + T5 jotai (3.0.1) done (commit 13bd6ed): select-listener-status helper + selectedStationIdAtom (fresh jotai store per test render). T8 Supabase done: @supabase/supabase-js 2.118.0 + null-safe createSupabaseClient factory + env schema entries. T6/T7 BLOCKED: Million.js and PattyCake are webpack-era compiler plugins; this repo builds web with Turbopack (Next 16) + Babel/Metro (Expo), so they either no-op under Turbopack or force a webpack downgrade, and Million.js has known React 19 incompatibilities.
