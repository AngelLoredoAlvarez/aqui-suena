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

S6 (Million.js). DEFERRED (not implemented): webpack-only compiler, incompatible
with Turbopack (Next 16 default) + React 19. Revisit if a Turbopack-
compatible compiler emerges.
S7 (PattyCake). DEFERRED (not implemented): same webpack/Turbopack concern.
Revisit alongside Million.js.

S8 (Supabase Auth). Add Supabase auth client + cross-platform scaffolding
(client + SSR helper), groundwork for the owner-portal module.

## Tasks

- [x] T1 — Hono backend (S1). Rewrite app/server/worker around Hono; keep tests green.
- [x] T2 — Valibot (S2). Swap zod→valibot in listener/router/client; keep tests green.
- [x] T3 — D1/SQLite schema (S3). pg-core→sqlite-core + drizzle.config dialect.
- [x] T4 — ts-pattern (S4). Add dep + migrate fetching states in packages/ui.
- [x] T5 — Jotai (S5). Add dep + minimal store(s).
- [x] T6 — Million.js (S6). Next.js compiler config. SKIPPED: webpack-only compiler, incompatible with Turbopack/Next 16; React 19 issues + unmaintained.
- [x] T7 — PattyCake (S7). Compiler config paired with ts-pattern. SKIPPED: same webpack/Turbopack incompatibility.
- [x] T8 — Supabase Auth (S8). Client + SSR scaffold.

## Log

L1 (2026-10-23, user): "User merged and pushed to main, then requested applying the missing technologies on a new branch so the project matches the T4 App project."
L2 (2026-10-23, user, scope answer): "Keep pnpm and ignore Solito; everything else should match."
L3 (2026-10-23): T3 D1/SQLite done (commit cbbad2b): schema.ts → sqlite-core, drizzle.config → sqlite + d1-http. T2 Valibot done (commit 27d5d9d): valibot 1.5.0, zod removed, tRPC v11 accepts Valibot via Standard Schema (~standard). 52 api + 2 db tests green.
L4 (2026-10-23): T1 Hono done (commit 14ff38d): hono 4.13.13 + @hono/node-server (createAdaptorServer) + @hono/trpc-server; CORS applied post-next on c.res. T4 ts-pattern (5.9.2) + T5 jotai (3.0.1) done (commit 13bd6ed): select-listener-status helper + selectedStationIdAtom (fresh jotai store per test render). T8 Supabase done: @supabase/supabase-js 2.118.0 + null-safe createSupabaseClient factory + env schema entries. T6/T7 BLOCKED: Million.js and PattyCake are webpack-era compiler plugins; this repo builds web with Turbopack (Next 16) + Babel/Metro (Expo), so they either no-op under Turbopack or force a webpack downgrade, and Million.js has known React 19 incompatibilities.
L5 (2026-10-23, user): "User declined adding Million.js and PattyCake." — T6 Million.js and T7 PattyCake DEFERRED by decision. Revisit if Turbopack-compatible options emerge. Parity considered complete except those two perf opts (justified: Turbopack-incompatible). Added to backlog as deferred items. Feature complete.
