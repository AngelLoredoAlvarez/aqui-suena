# Feature: local-dev-d1-r2 — Local D1 and dev R2 for the API

## Objective

Run the local Node API against a persistent SQLite-backed D1 database and the
Cloudflare `aqui-suena-media-dev` R2 bucket, so development exercises the real
D1 repositories and prefixed uploads instead of in-memory fakes. The local API
keeps falling back to in-memory repositories and media when the local database
or R2 credentials are absent.

Branch: `feat/local-dev-d1-r2`
Delivery strategy: `ask-on-risk` (default)
Test runner: `vitest` via `pnpm --filter @aqui-suena/api test`

## Specs

- S1. When `LOCAL_D1_PATH` is set, the Node API opens a `node:sqlite` database
  at that path, applies every migration in `packages/db/migrations` in filename
  order, and records applied files so restarts do not re-run them. A missing
  database file is created.
- S2. After migrations, the local database seeds `DEFAULT_PLAN_CATALOG`
  idempotently through the existing D1 plan writer, so subscriptions have their
  plan foreign keys.
- S3. When `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` are
  all present, the Node API uses `R2ObjectStorage` with `R2_BUCKET_NAME` and
  `R2_ENDPOINT`. Otherwise it uses `InMemoryObjectStorage` and logs the fallback.
- S4. `pnpm dev` sets `LOCAL_D1_PATH` to `.dev/d1/aqui-suena.sqlite` unless the
  caller already provided one. `.dev/` is gitignored. The dev Infisical
  environment supplies the R2 credentials for the `aqui-suena-media-dev` bucket.
- S5. Tests cover the D1 adapter subset, the migration runner, plan seeding, R2
  environment resolution, and a carousel read through the local D1 repositories.
- S6. Documentation states how the local D1 and dev R2 are selected, how to
  reset local data, and that missing credentials fall back to in-memory media.
  `.env.schema` declares `R2_ACCOUNT_ID` and `LOCAL_D1_PATH`.

## Tasks

- [x] T1 Local D1 adapter over `node:sqlite` (prepare/bind/all/first/run) with tests
- [x] T2 Migration runner with applied-file tracking and plan seed, with tests
- [x] T3 Shared R2 environment resolver and Worker refactor, with tests
- [x] T4 `main.ts` selection, `pnpm dev` default path, gitignore and env schema
- [x] T5 Integration test: carousel reads through local D1 repositories
- [x] T6 Docs, typecheck, lint, full API tests and local smoke verification

## Log

- L1. Objective: local development must use a persistent D1 and the dev R2
  bucket instead of in-memory repositories and in-memory media. The local Node
  entry remains the runtime; the Worker is unchanged except for the shared R2
  resolver.
- L2. Existing `node:sqlite` adapters in API tests prove the D1 subset used by
  the repositories: `prepare`, `bind`, `all`, `first`, `run`; no repository
  calls `batch` or `exec`.
- L3. Migrations are plain SQL split by `--> statement-breakpoint`; the
  migration tests already apply them to `node:sqlite` in order.
- L4. Route: all tasks inline. The change is one cohesive unit with no parallel
  disjoint edit surfaces, so no writer trigger holds.
- L5. T1 done: `packages/api/src/server/local/node-sqlite-d1.ts` adapts the D1
  subset over `node:sqlite`, normalizing booleans and `undefined`. Tests cover
  bound reads, writes, `first` and missing rows.
- L6. T2 done: `local-database.ts` opens the SQLite file, applies migrations with
  a `__local_migrations` tracking table, refuses an untracked non-empty
  database, and seeds `DEFAULT_PLAN_CATALOG` through `D1PlanCatalogWriter`.
  Tests verify 17 migrations on a fresh file, idempotent restarts and plan rows.
- L7. T3 done: `r2-from-env.ts` centralizes credential resolution, bucket
  defaulting and partial-config detection. The Worker's media selection now
  uses it; tests cover complete, partial and empty environments.
- L8. T4 done: `main.ts` selects local D1 and R2 dev storage when configured,
  logs the selected backends, and closes the database on shutdown. `pnpm dev`
  defaults `LOCAL_D1_PATH` to `.dev/d1/aqui-suena.sqlite`; `.dev/` is
  gitignored; `.env.schema` declares `R2_ACCOUNT_ID` and `LOCAL_D1_PATH`.
- L9. T5 done: the integration test creates an account, business, media row and
  flyer through the local D1 repositories and reads one carousel item.
- L10. Verification on 2026-11-23: the API started under the dev Infisical
  environment with a temporary local D1; it applied 17 migrations, reported
  `media storage R2 (aqui-suena-media-dev)`, `/health` answered
  `{"status":"ok","media":"configured"}` and `/trpc/ads.carousel` answered
  `{"result":{"data":[]}}` because the temporary database had no businesses.
  A temporary R2 smoke script exercised presigned PUT (200), signed GET (200,
  `image/jpeg`), HEAD (13 bytes), DELETE and a post-delete HEAD (`null`) against
  the dev bucket. The dev bucket CORS now lists `http://localhost:3000`,
  `https://aqui-suena-web-staging.pages.dev`, `tauri://localhost` and
  `http://tauri.localhost` with GET, PUT and HEAD.
- L11. Local data reset: delete `.dev/d1/aqui-suena.sqlite` and its `-wal` and
  `-shm` siblings, then restart. No remote dev database exists.
- L12. Final verification on 2026-11-23: focused API tests 11/11; full workspace
  tests player 66, API 1327 and UI 147 with no failures; `pnpm -r typecheck`
  clean; `scripts/dev.test.mjs` 33/33; Biome clean on the changed code;
  `varlock:audit` reports schema and code in sync; `varlock:codegen` regenerated
  the env types. The work ships in the commits on this branch; the PR is
  recorded in L14.
- L13. Supabase: `pnpm dev` on a feature branch resolves the dev project
  (`kugaxhsebtvucmlgpgkf`) through Infisical `dev`; staging resolves
  `hwfxlxtozdriqrnipyal`. The local API verifies JWTs against the dev
  `SUPABASE_JWKS_URL`, uses the dev anon and secret keys, and provisions the
  authenticated account into the local D1. No code change was needed. The web
  and native sign-in flows are not wired yet.
