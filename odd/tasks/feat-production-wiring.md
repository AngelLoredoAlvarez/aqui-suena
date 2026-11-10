# feat-production-wiring

Objective: close two production wiring gaps that fail silently — an empty D1 plan catalog and media silently falling back to an in-memory fake — on branch `feat/production-wiring`, TDD, one reviewable commit per problem.

Delivery strategy: `ask-on-risk` (two commits; the seed writes data only when an operator runs it).
Test runner: `pnpm --filter @aqui-suena/api test`.

## Specs

- **S1 — One plan catalog, seedable into D1.** `DEFAULT_PLAN_CATALOG: readonly Plan[]` is the single source of plan names, prices, benefits and entitlements in `domain/plans/`. `server/composition/plans.ts` builds its in-memory repository from that constant. A minimal write port `PlanCatalogWriter { upsert(plan: Plan): Promise<void> }` lives in the domain, with a D1 adapter using `INSERT ... ON CONFLICT(id) DO UPDATE` (idempotent, sets `updated_at`). The pure use case `seedPlans(writer, catalog)` returns the number of plans written; running it twice leaves the same rows. `POST /admin/seed-plans` in `server/worker.ts` is guarded by `ADMIN_TOKEN` exactly like the existing admin endpoints (404 when the token is missing or wrong) and answers `{ seeded: n }`.
- **S2 — Media storage is explicit, never a silent fake.** `createAppRouter` takes an explicit `ObjectStorage | undefined`; it never constructs `FakeObjectStorage`. When storage is absent, media mutations answer `SERVICE_UNAVAILABLE` (`503`) with `media storage is not configured`. Partial R2 configuration (some but not all of `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) is a configuration error: it is logged and media stays unconfigured. `/health` reports `{ "status": "ok", "media": "configured" | "unconfigured" }`. The local Node entry (`server/main.ts`) may use `FakeObjectStorage`, explicitly and with a comment. `FakeObjectStorage` stays where it is.

## Tasks

- T1 / S1 — extract `DEFAULT_PLAN_CATALOG`, composition from it, `PlanCatalogWriter`, `seedPlans`, D1 UPSERT adapter, `/admin/seed-plans`, tests. DONE. RED: 4 test files failed because `domain/plans/catalog` and the D1 writer did not exist. GREEN: 9 targeted tests, full api suite 650. Commit `d508b40`.
- T2 / S2 — explicit optional storage through `createApp`/`createAppRouter`, 503 on missing storage, partial-R2 logging, `media` in `/health`, explicit local fake, tests. DONE. RED: 9 tests failed (media still used the fake / health shape unchanged / partial R2 silent). GREEN: 42 targeted tests, full api suite 658. Commit `f86f82d`.
- T3 — docs/spec/backlog, closing gates. DONE.

## Log

### L2 — 2026-11-10 — closing evidence

- Commits: `d508b40` (plan catalog seed), `f86f82d` (explicit media storage).
- RED/GREEN per task is recorded in `## Tasks`; the api suite went 641 → 658 tests, all green.
- Closing gates: `pnpm -r typecheck` pass, `pnpm -r test` pass, `pnpm arch` no violations, Biome clean on touched source.
- Staging seed command (prepared, **not executed**; requires explicit authorization):

  ```bash
  STAGING_URL="https://aqui-suena-api-staging.<your-subdomain>.workers.dev"
  curl -fsS -X POST "$STAGING_URL/admin/seed-plans" \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  # expected: {"seeded":3}
  ```

- No push, no merge, no D1 writes and no secrets changed.

### L1 — 2026-11-10 — original request (verbatim)

Contexto: repo `aqui-suena` (monorepo Turborepo, pnpm). `main` está en a9522f9 con el package
`@aqui-suena/api` reestructurado, reglas de capas en `.dependency-cruiser.cjs` y 641 tests verdes.
Leé antes de empezar: `packages/api/README.md` ("Directory conventions"),
`odd/tasks/fix-p0-directory-security.md` (patrón de guardas y errores), y
`packages/api/DEPLOY.md`.

Objetivo: cerrar dos agujeros de wiring de producción que hoy fallan en silencio. TDD estricto,
una rama, un commit por problema.

Rama: `feat/production-wiring` desde `main`.

Constraints:

- Nunca trabajar sobre `main`. Commits convencionales, sin atribución de IA.
- No push, no merge, no escrituras contra D1 ni cambios de secretos sin autorización explícita.
- Biome: prohibidas non-null assertions (`!`) y optional chaining inseguro.
- Artefactos en inglés; conversación en español.
- Al cerrar: `pnpm -r typecheck`, `pnpm -r test`, `pnpm arch`, Biome sobre lo tocado.
- Actualizá spec/backlog. Guardá memoria.

Problema 1 — El catálogo de planes está vacío en D1 (`DEFAULT_PLAN_CATALOG`, writer, `seedPlans`, `POST /admin/seed-plans` con `ADMIN_TOKEN`, idempotente, tests).
Problema 2 — Media cae a un fake silencioso en producción (storage explícito, 503 sin storage, config parcial R2 error, `/health` con `media`, fake solo en Node local, tests).
Fuera de alcance: secretos del Worker, `wrangler secret put`, auth, routers de directory, mover `FakeObjectStorage`.
Cierre: commits, RED/GREEN, typecheck/tests/arch/Biome y el comando `curl` para sembrar staging, sin ejecutarlo. No push ni merge.
