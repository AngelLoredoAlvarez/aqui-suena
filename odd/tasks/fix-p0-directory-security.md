# fix-p0-directory-security

Objective: close the three P0 directory vulnerabilities (IDOR, hidden businesses publicly readable, 90-day deletion blocked by foreign keys) on branch `fix/p0-directory-security`, one reviewable commit per problem.

Delivery strategy: `ask-on-risk` (three commits, expected under 400 authored changed lines each).
Test runner: `pnpm --filter @aqui-suena/api test` and `pnpm --filter @aqui-suena/db test`.

## Specs

- **S1 — IDOR (authorization on every directory mutation).** Every mutating directory procedure must verify that the authenticated account owns the target business before writing. Create mutations verify the `businessId` found in the input; update/delete mutations resolve the entity's `businessId` and verify it. A business owned by another account, or a missing entity, answers `NOT_FOUND` (never `FORBIDDEN`) so existence is not leaked. Public reads (`list`, `getById`) stay unauthenticated, except visibility filtering from S2. Unauthenticated callers still get `UNAUTHORIZED`. `businesses.create` ignores the client-supplied `accountId` and uses `ctx.user.accountId`.
- **S2 — Hidden businesses are not public.** `BusinessRepository.list()` returns only rows with `hidden_at IS NULL`; `getById()` returns `null` for a hidden business. Public child list queries join the parent business and exclude `hidden_at IS NOT NULL`. Owner-scoped reads (`listByAccount`, `getByIdForOwner`, and the owner router endpoints) still return hidden businesses. `getBusinessCarousel` must not include hidden businesses.
- **S3 — Retention deletion cascades.** Every foreign key to `businesses.id`, plus `photos.work_entry_id` and `photos.product_id`, uses `onDelete: "cascade"`. Deleting a business (manual or `deleteExpired`) removes its products, photos, services, work entries, flyers, and hours. The schema migration against D1 is prepared but not executed: it requires explicit user authorization plus a time-travel bookmark and row-count pre-flight.

## Tasks

- T1 / S1 — reusable ownership guard in `domain/directory/authorization.ts`; applied to all eight directory routers; router tests for cross-account and unauthenticated access. DONE. RED: 17/18 authorization tests failed (factory signatures + missing guards), GREEN: 526 api tests. Commit `8904f08`.
- T2 / S2 — hidden filtering in D1 repositories, in-memory parity, owner endpoints, carousel check; tests. DONE. RED: 8 visibility tests failed, GREEN: 536 api tests. Commit `2a30465`.
- T3 / S3 — cascade FKs in `packages/db/src/schema.ts`, SQLite-backed deletion test; migration pre-flight documented, not run. DONE. RED: 2 schema FK tests failed, GREEN: 14 db tests + 538 api tests. Migration guide: `packages/db/MIGRATION-cascade-delete.md`. Commit `01a45a8`.

## Log

### L2 — 2026-11-10 — closing evidence

- T1: `fix(api): enforce business ownership on directory mutations` — `8904f08`.
- T2: `fix(api): hide hidden businesses from public directory reads` — `2a30465`.
- T3: `fix(db): cascade directory children on business deletion` — `01a45a8`.
- Closing gates: `pnpm -r typecheck` pass, `pnpm -r test` pass (api 538, db 14, ui 143, player 66, config 10), `pnpm arch` no violations, Biome clean on touched source.
- Pending: the D1 migration is prepared in `packages/db/MIGRATION-cascade-delete.md` and has NOT been executed. No push, no merge.

### L1 — 2026-11-10 — original request (verbatim)

Contexto: repo `aqui-suena` (monorepo Turborepo, pnpm). `main` está en 3f2d269 con el package
`@aqui-suena/api` ya reestructurado: domain/infrastructure/server separados, reglas de capas en
`.dependency-cruiser.cjs` y 505 tests verdes. Antes de tocar nada, leé `packages/api/README.md`
(secciones "Layout" y "Directory conventions") y `odd/tasks/backlog.md`.

Objetivo: arreglar las tres vulnerabilidades P0 del directorio de negocios que quedaron
identificadas y diferidas a ramas aparte. Trabajá en TDD estricto (RED → GREEN → REFACTOR), en
una rama nueva desde `main`, con un commit revisable por problema.

Rama: `fix/p0-directory-security`.

Constraints del repo:
- Nunca trabajar sobre `main`. Commits convencionales, sin atribución de IA.
- No hacer push, merge ni correr migraciones contra D1 sin pedirme autorización explícita.
- Biome es el linter: prohibidas las non-null assertions (`!`) y el optional chaining inseguro.
- Artefactos (código, tests, comentarios, docs) en inglés. La conversación, en español.
- Al cerrar: `pnpm -r typecheck`, `pnpm -r test`, `pnpm arch`, y Biome sobre lo tocado.
- Actualizá los specs/backlog si cambia comportamiento observable. Guardá en memoria lo aprendido.

P0-1 IDOR; P0-2 hidden businesses publicly listed; P0-3 retention deletion blocked by FKs.
Closing evidence: commits, RED/GREEN per problem, typecheck/tests/arch/Biome, pending migration.
No push, no merge, no D1 migration without explicit authorization.
