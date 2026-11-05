# SPEC: Support Chatbot

## Status

Scope defined on 2026-11-04. Implementation deferred; a task plan will be created
before any code change. This document records the agreed product scope and the
architectural constraints that follow from it.

## Goal

A read-only, session-aware support assistant embedded in the product (web,
desktop, mobile). It answers questions about the platform using real data, never
mutates data, and never leaks data across users.

It is **not** an action-taking agent: creating, editing, or deleting businesses,
services, products, plans, or any other entity stays a manual action in the UI.

## In scope

### A. Plans and memberships (public)

- Plan info: names, audiences, descriptions, benefits, monthly/annual prices,
  currency.
- Differences between plans, which plan fits a given need.
- Subscription lifecycle: how to subscribe, cancel, change plan, grace period
  on failed renewal.
- General billing help: payment methods (card, OXXO, SPEI), receipts, failed
  payments, plan changes, downgrades and their affected fields.

### B. Business directory (public)

- Search and info about businesses: name, category, address (textual only),
  phone, email, timezone, delivery flag.
- Hours of operation.
- Services and products with descriptions and prices.
- Work entries, photos, flyers (public ones).

**Location/distance (explicitly out of chat scope):** the chat returns the
business's textual address only. No latitude/longitude storage, no geocoding,
and no distance calculation are part of the chat. "Nearest business to me"
is a separate UI/directory feature if pursued later.

### D. "My business" (authenticated owner, read-only)

- The owner's own business(es) with full detail (including non-public fields
  such as email, internal photos).
- The owner's own services, products, hours, photos, flyers, work entries.
- The owner's own invoices, receipts, and payments (history and status).

## Out of scope

- Any mutation: no creating/editing/deleting businesses, services, products,
  photos, hours, plans, subscriptions, or any entity.
- Other users' or other owners' data (businesses, accounts, invoices, payments).
- Internal/non-public data of businesses the user does not own.
- Credentials, tokens, secrets, API keys.
- Radio/stations playback troubleshooting and support (not covered by this
  chat; may be a separate spec later).
- Location/distance and geocoding: chat returns textual address only.
- Generic technical support for the app (bugs, "how do I use feature X") unless
  explicitly added later.
- Any topic unrelated to the platform: the chat declines politely and naturally.

## Access by user type

| User type           | Sees                                                            |
| ------------------- | --------------------------------------------------------------- |
| Anonymous           | A + B (public only)                                             |
| Authenticated owner | A + B (public) + D (only their own data)                        |
| Never               | Other owners' data, other users' invoices/payments, PII/secrets |

Authorization is enforced server-side by `accountId` / `businessId` derived from
the authenticated session, never from chat input.

## Data access mechanism

Two mechanisms, chosen by data type:

1. **Semantic search (Cloudflare Vectorize)** — for public, free-text-searchable
   content: plans (A) and the business directory (B: name, category,
   description, services, products). Embedded and seeded; re-indexed when the
   underlying data changes.
2. **Direct DB read (real time, filtered by owner)** — for private/structured
   owner data (D: own business detail, services, products, hours, photos,
   invoices, receipts, payments). Read on demand by `accountId`/`businessId`;
   never embedded or indexed.

Private data never enters the vector index. It is injected into the prompt only
when the authenticated owner requests it, and only their own.

## Refusal and no-hallucination policy

- **Mutations or others' data:** refuse and point to the correct channel (UI for
  edits, human support otherwise). Never perform or imply an action.
- **No data / unknown:** say so explicitly and suggest human support. Never
  invent plans, businesses, services, prices, hours, or invoices.
- **Ambiguous owner query** (e.g. "my invoices" without a period): ask for
  clarification before querying.
- **Privacy:** when asked about another business/user, refuse without confirming
  or denying existence.
- **Off-topic (unrelated to the platform):** decline naturally and gently, with
  no abrupt or robotic tone.
- **Injection protection:** user messages are delimited and treated as data, not
  instructions (already in place for the plan catalog).

## Non-goals and constraints

- The chat is a retrieval + answer layer only. It has no tools that mutate state.
- Free-tier constraints (Cloudflare Workers AI neurons, Vectorize queried/stored
  dimensions) must be respected; do not vectorize everything by default.
- Prompt size budget: tune top-K per domain; do not dump full catalogs when
  vector search is available.
- Sanitization: never put personal, payment, or provider (Conekta) data into
  prompts that train vendor models; keep prompts to the owner's own needed slice.

## Open questions

- Daily caps (per-account and global) and auto-cutoff thresholds (Level 1 guard).
- Provider abstraction for swapping Workers AI (Groq/OpenRouter) — keep the
  `AiBinding` port.
- Whether to add `support.feedback` logging of unresolved queries to discover
  intents.
- Re-indexing strategy for public data (manual seed endpoint vs. triggers).
- Whether owner-private data should be summarized or returned verbatim in the
  prompt (privacy review).

## References

- `SPEC-owner-portal.md` — "Future: owner support chatbot" (prototype and
  Level 0/Level 1 strategy).
- `packages/api/src/domain/support/plan-catalog.ts` — `PlanCatalogRetriever`
  port, `FullCatalogRetriever`, `VectorPlanCatalogRetriever`, `planDocument`,
  `seedPlanVectors`.
- `packages/api/src/server/routers/support.ts` — `support.chat` router,
  `buildCatalog`, system prompts.
- `packages/api/src/worker.ts` — wiring, `PLAN_VECTORS`, `AI_GATEWAY_ID`.
- `packages/api/README.md` — retrieval and Vectorize/AI Gateway setup.
- `packages/db/src/schema.ts` — domain tables (plans, businesses, services,
  products, hours, photos, flyers, work_entries, accounts, subscriptions,
  payments, invoices).
