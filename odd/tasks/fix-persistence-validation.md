# fix-persistence-validation

Objective: stop trusting values read from the database and from the client — validate persisted enums in the D1 mappers, verify media uploads against real storage metadata, and map client-caused failures to the right tRPC codes — on branch `fix/persistence-validation`, TDD, one reviewable commit per problem.

Delivery strategy: `ask-on-risk` (three commits, each expected under 400 authored changed lines).
Test runner: `pnpm --filter @aqui-suena/api test`.

## Specs

- **S1 — Persisted enums are validated on read.** Pure parsers exist in the domain, one per persisted enum: `parsePlanId` (validates against `ENTITLEMENTS`), `parseSubscriptionStatus`, `parsePaymentStatus`, and `parseBusinessCategory` (validates against `businessCategorySchema`). Each parser accepts every valid value and throws `DataIntegrityError` (carrying `field` and `value`) for an unknown value; it never returns a silent default. Every D1 mapper uses the parser instead of `as`: `D1PlanRepository` (`id`), `D1AccountRepository` (`plan_id`), `D1BusinessRepository` (`category`), `D1InvoiceRepository` (`plan_id`), `D1PaymentRepository` (`status`), `D1SubscriptionRepository` (`plan_id`, `status`). A `DataIntegrityError` crossing a tRPC procedure is logged with its field and value and answered as `INTERNAL_SERVER_ERROR` with the generic message `Internal server error`.
- **S2 — `media.confirm` trusts storage, not the client.** `confirm` rejects a `key` that does not start with `${input.kind}/${ctx.user.accountId}/` with `NOT_FOUND` (never revealing existence). It compares `meta.contentType` and `meta.size` against the declared `contentType`/`sizeBytes` and answers `BAD_REQUEST` with a clear message on a mismatch. It calls `validateMediaUpload(kind, meta.contentType, meta.size)` before persisting (an unsupported real type is `BAD_REQUEST`) and persists the real `meta.size` and `meta.contentType`, never the client values. A missing object stays `NOT_FOUND`.
- **S3 — Client-caused failures map to typed tRPC codes.** Domain errors (`ValidationError`, `NotFoundError`, `ConflictError`) are mapped to `TRPCError` by one thin server adapter (`BAD_REQUEST`, `NOT_FOUND`, `CONFLICT`). Directory and media reads answer `NOT_FOUND` when the entity is missing or owned by another account instead of `null`/`false`; malformed ids keep answering `BAD_REQUEST`; state conflicts (for example `SubscriptionService` acting on a non-active subscription) answer `CONFLICT`. Existing correct codes are unchanged: ownership denials stay `NOT_FOUND`, `listings.ts` `UPGRADE_REQUIRED` stays `FORBIDDEN`, `support` stays `BAD_REQUEST`. Each covered endpoint has tests for malformed id, missing id, and the happy path, asserting `error.code`.

## Tasks

- T1 / S1 — domain parsers + `DataIntegrityError` + router mapping; replace every `as` in the six D1 mappers; parser and invalid-row mapper tests. DONE. RED: the 5 domain/trpc test files could not resolve `shared/domain-error` (no tests ran). GREEN: 172 targeted tests, full api suite 611. Commit `4a7bbf5`.
- T2 / S2 — `media.confirm` key-prefix, metadata comparison, real-value persistence and revalidation; router tests with `FakeObjectStorage`. DONE. RED: 6 media router tests failed (prefix/mismatch/revalidation missing; missing object answered 500). GREEN: 12 media tests, full api suite 617. Commit `3c94e7d`.
- T3 / S3 — domain error adapter in the tRPC base procedure; directory/media/plans routers throw typed errors; `SubscriptionService` and `AccountRepository` use typed errors; per-endpoint error-code tests. DONE. RED: 14 tests failed across 11 files (null/`false`/500 instead of NOT_FOUND, missing typed errors). GREEN: 149 targeted tests, full api suite 641. Commit `f99fed4`.
- T4 — docs/spec/backlog alignment, closing gates (`pnpm -r typecheck`, `pnpm -r test`, `pnpm arch`, Biome on touched files). DONE.

## Log

### L2 — 2026-11-10 — closing evidence

- Commits: `4a7bbf5` (persisted enums), `3c94e7d` (media confirm), `f99fed4` (error codes).
- RED/GREEN per task is recorded in `## Tasks` above; the full api suite went 557 → 641 tests, all green.
- Closing gates: `pnpm -r typecheck` pass, `pnpm -r test` pass, `pnpm arch` no violations, Biome clean on touched source.
- Endpoint → error code:

| Endpoint | Malformed id | Missing/foreign | Notes |
| --- | --- | --- | --- |
| `businesses.getById` | `BAD_REQUEST` | `NOT_FOUND` | public read |
| `businesses.getMine` | `BAD_REQUEST` | `NOT_FOUND` | owner read |
| `businesses.update` / `delete` | `BAD_REQUEST` | `NOT_FOUND` | ownership denial stays `NOT_FOUND` |
| `businesses.create` (cap) | `BAD_REQUEST` | — | unchanged `FORBIDDEN` + `UPGRADE_REQUIRED` |
| `products.getById` / `update` / `delete` | `BAD_REQUEST` | `NOT_FOUND` | |
| `flyers.getById` / `update` / `delete` | `BAD_REQUEST` | `NOT_FOUND` | |
| `hours.getById` / `update` / `delete` | `BAD_REQUEST` | `NOT_FOUND` | |
| `photos.getById` / `update` / `delete` | `BAD_REQUEST` | `NOT_FOUND` | |
| `services.getById` / `update` / `delete` | `BAD_REQUEST` | `NOT_FOUND` | |
| `workEntries.getById` / `update` / `delete` | `BAD_REQUEST` | `NOT_FOUND` | |
| `media.confirm` | `BAD_REQUEST` (schema) | `NOT_FOUND` (key prefix / object / owner) | MIME/size mismatch `BAD_REQUEST` |
| `media.delete` | `BAD_REQUEST` | `NOT_FOUND` | |
| `plans.getById` | `BAD_REQUEST` | `NOT_FOUND` | unknown plan id is `NOT_FOUND` |
| `SubscriptionService` | — | `NotFoundError` (`NOT_FOUND`) | non-active/duplicate → `ConflictError` (`CONFLICT`) |
| `listings.*` (`UPGRADE_REQUIRED`) | — | — | unchanged `FORBIDDEN` |
| `support.chat` | — | — | unchanged `BAD_REQUEST` |

- No schema or data migration; this work only validates what it reads.
- No push, no merge.

### L1 — 2026-11-10 — original request (verbatim)

Contexto: repo `aqui-suena` (monorepo Turborepo, pnpm). `main` está en b6ed007 con el package
`@aqui-suena/api` reestructurado, reglas de capas en `.dependency-cruiser.cjs` y 557 tests verdes.
Leé antes de empezar: `packages/api/README.md` ("Directory conventions"), `odd/tasks/fix-p0-directory-security.md`
(patrón de guardas y mapeo de errores) y `odd/tasks/fix-p0-directory-security.md` por el estilo de
commits y docs.

Objetivo: dejar de confiar en valores que vienen de la base o del cliente. Tres problemas
relacionados con la persistencia y los errores de la API. TDD estricto, una rama, un commit por
problema.

Rama: `fix/persistence-validation` desde `main`.

Constraints:
- Nunca trabajar sobre `main`. Commits convencionales, sin atribución de IA.
- No push, no merge, no migraciones D1 sin autorización explícita.
- Biome: prohibidas non-null assertions (`!`) y optional chaining inseguro.
- Artefactos en inglés; conversación en español.
- Al cerrar: `pnpm -r typecheck`, `pnpm -r test`, `pnpm arch`, Biome sobre lo tocado.
- Actualizá spec/backlog si cambia comportamiento observable. Guardá memoria al final.

Problema 1 — Casts de enum en los mappers D1 (validar con parsers de dominio; `DataIntegrityError` tipado, router → `INTERNAL_SERVER_ERROR` genérico y logueable con campo y valor).
Problema 2 — `media.confirm` confía en el cliente (prefijo de key, comparar MIME/tamaño, persistir `meta`, revalidar).
Problema 3 — Errores de cliente devuelven 500 (errores de dominio tipados + adaptador; input inválido → `BAD_REQUEST`, inexistente/ajeno → `NOT_FOUND`, conflicto de estado → `CONFLICT`; no cambiar códigos ya correctos).
Fuera de alcance: paginación, seeds de planes, R2 fail-fast, cascada de borrado, estructura de carpetas, migrar datos.
Cierre: commits, evidencia RED/GREEN por test nuevo, typecheck/tests/arch/Biome, tabla endpoint → código de error. No push, no merge; esperar instrucción.
