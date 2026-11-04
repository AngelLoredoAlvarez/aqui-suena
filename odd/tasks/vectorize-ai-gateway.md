# Feature: Vectorize + AI Gateway for support chatbot

Objective: introduce Cloudflare Vectorize (vector search) and AI Gateway
(observability) into the support chatbot, replacing full-catalog prompt
injection with retrieval-based context, as a learning exercise on real data.

Branch: `feature/vectorize-ai-gateway`
Delivery strategy: single-pr
Test runner: `pnpm --filter @aqui-suena/api test` (vitest)

## Specs

- S1: AI Gateway observability is enabled for the Workers AI binding via
  `wrangler.toml` (`[ai_gateway]` with `log_id`). Core features (analytics,
  caching, rate limiting) are free on all plans; no code change to domain.
  Requires the user to create a gateway in the Cloudflare dashboard.
- S2: A Vectorize index binding (`PLAN_VECTORS`) is declared in
  `wrangler.toml`; index creation is a documented `wrangler vectorize create`
  step. Embedding model is configurable, default multilingual
  (`@cf/baai/bge-m3`) because prompts are Spanish and queries may be es/en.
- S3: The support chatbot context is produced by a retrieval port
  (`PlanCatalogRetriever`) with two implementations: `FullCatalogRetriever`
  (current behavior) and `VectorPlanCatalogRetriever` (embed query, query
  index, map matches back to plans via `PlanRepository`). On any retrieval
  failure the chatbot falls back to the full catalog, never to a broken
  reply.
- S4: Seed script embeds all active plans from the plan repository and
  upserts them into the Vectorize index (`pnpm --filter @aqui-suena/api
  seed:vectors`).
- S5: Wiring: `worker.ts` builds the Vectorize-backed retriever when the
  binding exists; local/test/default wiring keeps the full-catalog retriever.
- S6: README and relevant SPEC docs updated to reflect the new bindings,
  setup steps, and retrieval flow.

## Tasks

- T1 (S1): add `[ai_gateway]` config + setup docs — inline
- T2 (S2): add Vectorize binding + index creation docs — inline
- T3 (S3, S4): TDD retrieval port, both retrievers, fallback logic, tests — inline
- T4 (S4): seed script for plan embeddings — inline
- T5 (S5): wiring in worker/router with dependency injection — inline
- T6 (S6): docs update (README, SPEC) — inline

## Log

- L1 (2026-11-04): "¿podemos iniciar la inclusion de vectorize y ai gatway
  en lo que tenemos del proyecto?" — followed by scope choice (a): vectorize
  the plan catalog as a learning exercise.
- L2 (2026-11-04): free-tier limits verified from official docs: Vectorize
  free = 30M queried dims/mo, 5M stored dims, 100 indexes; AI Gateway core
  free on all plans, 5% fee only on Unified Billing credits (we use BYOK /
  native Workers AI, so no fee).
