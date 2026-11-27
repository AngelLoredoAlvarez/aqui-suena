# Quality audit fixes

Objective: close the TDD, SOLID and Clean Code gaps found in the full-repo audit and reorganize the directories that need internal subfolders. Branch `chore/quality-audit-fixes`; delivery `single-pr`; test runner `vitest run` per package (typecheck + coverage gates in CI).

## Specs

- S1 — Add tests for `normalizeAccountEmail` and `anonymizedAccountEmail` in `packages/api/src/domain/accounts/account.ts`. DONE.
- S2 — Add wiring tests for the five cron jobs under `packages/api/src/server/jobs/`. IN PROGRESS (worker).
- S3 — Add wiring tests for the untested composition modules. IN PROGRESS (worker).
- S4 — Add tests for `packages/api/src/server/http/admin-routes.ts`. IN PROGRESS (worker).
- S5 — `packages/player/src/status/status.ts` — REVISED: type-only union, no runtime behavior, no test is meaningful. No change.
- S6 — Add tests for untested UI logic/components. IN PROGRESS (worker).
- S7 — Anemic domain models — REVISED: pure type + port definitions with validation living at the valibot router boundary (correct); no leak, no change.
- S8 — Move the six invoice composition files into `composition/invoice/`. DONE.
- S9 — Move the Conekta webhook files into `http/webhooks/`. DONE.
- S10 — Group the 18 `infrastructure/memory/in-memory-*` doubles into per-domain subfolders. DONE.
- S11 — Move `domain/billing/billing-interval.ts` into `model/`. DONE.
- S12 — Split `ui/ads-carousel/` into `components/`, `hooks/`, `utils/`. DONE.
- S13 — Rename `conekta-webhook-route.test.ts` to `app-conekta-webhook-route.test.ts` (maps to `app.ts`). DONE.
- S14 — Desktop app frontend — REVISED: false positive. The desktop already wraps the web app (tauri.conf.json `frontendDist: ../../web/out`, `devUrl`/`beforeDevCommand`/`beforeBuildCommand` all wired; `fix/desktop-build` feature shipped it). Verified the static export still builds. No change.

## Tasks

- T1 — S1 domain account tests — DONE (commit c80e0a4)
- T2 — S7 anemic model verification — DONE (no defect; type-only)
- T3 — S8 composition/invoice reorg — DONE (commit 1821ce9)
- T4 — S9 http/webhooks reorg — DONE (commit 1821ce9)
- T5 — S10 memory group reorg — DONE (commits 1821ce9, d022458)
- T6 — S11 billing-interval move — DONE (commit 1821ce9)
- T7 — S12 ads-carousel split — DONE (commit 34ee602)
- T8 — S13 conekta test rename — DONE (commit 1821ce9)
- T9 — S2 jobs wiring tests — IN PROGRESS (worker)
- T10 — S3 composition wiring tests — IN PROGRESS (worker)
- T11 — S4 admin-routes tests — IN PROGRESS (worker)
- T12 — S5 player status — CLOSED (no test meaningful)
- T13 — S6 UI tests — IN PROGRESS (worker)
- T14 — full verification: typecheck + test + coverage — PENDING

## Log

- L1 — Full-repo audit for strict TDD, SOLID and Clean Code, plus directory organization; every finding must be fixed regardless of size.
- L2 — Reorg executed (composition/invoice, http/webhooks, memory by domain, billing/model, ads-carousel split, conekta route test rename); full typecheck + tests green after each stage.
- L3 — S5 and S7 investigated: both are type-only modules (no runtime behavior) — validation correctly lives at the valibot router boundary; no test is meaningful, recorded as no-change rather than fabricating a test.
- L4 — S14 investigated further: the desktop already wraps the web app (external Tauri frontend via `frontendDist`); the earlier "no frontend" reading only checked file extensions inside `apps/desktop/`. Verified `STATIC_EXPORT=1 pnpm --filter web build` still passes after the reorg. No code change needed.
