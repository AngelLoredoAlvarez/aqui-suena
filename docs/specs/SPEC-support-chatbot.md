# SPEC: Support Chatbot

## Status

Scope defined on 2026-11-04. Partially implemented: `support.chat` ships the
read-only plan-catalog path (bilingual es/en, prompt-injection guard, optional
Vectorize RAG seeded by `POST /admin/seed-vectors`, optional AI Gateway), and the
router is live for unauthenticated listeners. The multimodal media retrieval and
listener image-query designs are documented below but not implemented. Still
pending before it can cover the authenticated scope: Supabase Auth identities,
per-account and global daily caps, and the sanitization rules for account,
payment and invoice data. This document remains the source for the agreed scope
and its architectural constraints.

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
- General billing help: payment methods (card, cash (Conekta Efectivo), SPEI), receipts, failed
  payments, plan changes, downgrades and their affected fields.

### B. Business directory (public)

- Search and info about businesses: name, category, address (textual only),
  phone, email, timezone, delivery flag.
- Hours of operation.
- Services and products with descriptions and prices.
- Work entries, photos, flyers (public ones), including media search through the
  multimodal `media-catalog` index when enabled, and temporary listener photo
  queries described below.

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
- Storing listener-uploaded query images: they are processed transiently and
  never written to R2, D1, logs or the vector index.
- Identifying people, faces, license plates or private addresses from a listener
  photo; only public business/product information is returned.
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

### Multimodal media retrieval (planned, free tier)

Owners upload photos and flyers; the assistant should be able to find relevant
public media ("fotos de tacos", "el flyer de la promo") and, for the owner,
mention their own unpublished images. The design below is chosen to stay inside
the Cloudflare free tier and to keep private media out of the shared index.

#### Decision

- **Index public listing media only.** An image enters the media index when it is
  attached to a visible listing. Owner-private, hidden or unpublished media is
  read from D1 at answer time and never embedded; avatars and spot audio are not
  indexed.
- **Use `@cf/google/embeddinggemma-2` multimodal embeddings in a dedicated
  `media-catalog` Vectorize index at 512 dimensions.** It maps text and images
  into one space, so a text query retrieves image vectors directly; the image
  bytes stay in R2 and Vectorize stores only vectors + metadata. Do not mix it
  with the existing plan index, which uses `@cf/baai/bge-m3` at 1024 dimensions.
- **No bulk vision captioning.** Captioning every photo with a vision model is
  the most expensive free-tier path and loses detail. Photos are embedded from a
  downscaled image derivative; flyers additionally get an OCR pass because their
  text ("2x1", menu items, phone) is the searchable content.
- **OCR only for flyers, lazily.** Run `@cf/moondream/moondream3.1-9B-A2B`
  caption/OCR on public flyers in a throttled backfill (one flyer per business)
  and store the text in D1. No OCR for every product photo.
- **Vision at answer time only for a specific image.** If the user asks what a
  particular image shows, the assistant may send that one selected image to a
  vision model, with a strict per-request/per-day cap. This is not a second
  indexing path.
- **Paid AI Search, Cloudflare Images and models that require a paid billing
  method are excluded.** The free-tier plan must not create a recurring charge.

#### Data model (D1)

`media_insights` (one row per media, new table):

- `media_id` (PK, FK to `media`), `business_id`, `kind`, `visibility`
  (`public`/`private`), `ocr_text`, `embedding_model`, `dimensions`,
  `content_hash`, `status` (`pending`/`ready`/`failed`), `embedded_at`.
- `content_hash` avoids re-embedding unchanged bytes; a changed object or
  attachment invalidates the row.
- Deletes cascade from `media`; business visibility changes update or delete the
  insight, and the query still re-checks D1 before signing any URL.

#### Ingest and retrieval flow

1. After `confirm` + attach to a visible listing, or via the daily/scheduled
   backfill, generate a **512px image derivative** (client-side or free Worker
   WASM; never send the 2 MB original) and store the OCR text for flyers.
2. Embed the derivative (and the OCR text + business/product context for
   flyers) with `embeddinggemma-2` at 512 dimensions; upsert one vector per
   media with metadata `{ mediaId, businessId, kind, visibility }`.
3. At query time, embed the user text with the same model and task prefix,
   query top-K with a public-visibility filter, then load the media/business
   rows from D1, re-check visibility/ownership, and sign short-lived URLs. The
   answer can cite/link the images; it never returns a raw R2 key.
4. Owner scope ("my photos") is a direct D1 read filtered by `accountId` /
   `businessId`, not a vector query; private data is never indexed.
5. Delete the vector when the media row or business is deleted, or when it stops
   being public.

#### Free-tier budget

| Resource          | Free allowance                        | Design impact                                                                                                                                                                                               |
| ----------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workers AI        | 10,000 Neurons/day (resets 00:00 UTC) | `embeddinggemma-2` is 154 Neurons/M tokens, so ~1,000 public images cost well under 200 Neurons. Flyer OCR is the expensive part (~20-40 Neurons per flyer with Moondream); cap it to a small daily batch.  |
| Vectorize stored  | 5M dimensions/month, 100 indexes      | At 512 dims, ~9,700 vectors. One `media-catalog` index plus the existing plan index stays within 100 indexes. If public media grows, move to 256 dims (~19,500 vectors) or prune before adding a paid plan. |
| Vectorize queried | 30M dimensions/month                  | Cap assistant image queries and use top-K; monitor the dashboard.                                                                                                                                           |
| R2                | 10 GB / free ops                      | Image bytes stay in R2; the derivative is small and the original remains the source for signed reads.                                                                                                       |

Guardrails: a D1 daily neuron counter with a hard cutoff (for example 8,000/day,
leaving room for chat), batch/backfill throttling, skip unchanged hashes, no
indexing of avatars/audio, and a circuit breaker that falls back to D1/text
answers when Vectorize or Workers AI is unavailable. Benchmarks for the image
derivative and OCR must run before enabling the feature; if the free allowance is
exceeded, the feature pauses rather than bills.

#### Rejected alternatives

- **Caption every image with a vision model and embed the caption:** accurate
  for text but consumes far more Neurons and loses pixel-level visual detail.
- **CLIP-style separate image index:** historically unavailable on Workers AI;
  `embeddinggemma-2` now gives a native multimodal space without a second model.
- **Vision model per query over many images:** higher latency and cost, and
  exposes more bytes than needed.
- **Cloudflare AI Search (GA):** it supports native image retrieval/OCR, but it
  is a billed product beyond its free allotment and violates the zero-cost rule.
- **Indexing private owner media in the shared index:** leaks across users;
  private reads stay in D1.

### Listener image queries (planned, free tier)

An anonymous listener may attach a photo saved on their device and ask for the
business, product, service or contractor it shows. The photo is **temporary
input**, not catalog media: it is resized client-side (max edge ~1024 px, EXIF/GPS
stripped), sent to the chat request, processed in memory and never written to R2,
D1, logs or the vector index.

#### Flow

1. Try the cheap path first: embed the query image with
   `@cf/google/embeddinggemma-2` (512 dimensions) and query the public
   `media-catalog` index. This costs a fraction of a Neuron.
2. If there is a confident public match, load the media/business rows from D1,
   re-check visibility, sign a short-lived URL and answer with the match and a
   confidence cue. No vision model is called.
3. If the visual match is weak, or the photo is mostly text (flyer, menu, sign,
   business card, van), run OCR/caption with
   `@cf/moondream/moondream3.1-9B-A2B`, then query the directory/media text index
   and answer with candidate businesses.
4. If candidates remain ambiguous, ask for the business name or city. Do **not**
   infer location, distance or "nearest"; that stays out of scope.
5. If the listener explicitly asks "what is in this photo?", allow one vision
   call on that selected image, under the same daily cap.

#### What works and what does not

- **Good:** flyers with offers, menus, storefront signs, business cards, van
  lettering, contractor names/services; products with an existing catalog photo.
- **Medium:** generic products or dishes matched visually against catalog photos;
  quality depends on coverage and angle/lighting.
- **Refused:** identifying people, faces, plates or private homes; returning
  another owner's private media; exact identification when there is no textual
  or visual evidence; location/distance queries.

#### Privacy and abuse

- No image persistence and no image bytes in logs; only aggregate outcome codes
  (match/ambiguous/no-match) may be counted.
- Limit size/format, rate-limit per IP/account, and refuse repeated abusive
  uploads. A photo containing a person is not used to identify that person.
- Public business/product data only; owner-private media never enters the query
  path.

#### Free-tier budget

- Visual embedding query: ~0.1 Neuron or less; it is the default first pass.
- Vision OCR/caption: ~20–40 Neurons per query; with 10,000 Neurons/day shared
  with chat, this is a low-volume feature (hundreds of queries/day at most, fewer
  once chat usage is counted).
- Guards: per-IP and global daily caps, a dedicated vision-query budget, a
  circuit breaker that answers "no puedo analizar la foto ahora" when exhausted,
  and a feature flag. If the free allowance is exceeded, the feature pauses; it
  never upgrades to a paid plan.
- Cache only the aggregate result per image hash for a short TTL (no image
  bytes); a repeated identical photo should not spend Neurons twice.

#### Dependencies

This needs: an image input on `support.chat` (today text-only), the
`media-catalog` index and flyer OCR backfill from the previous section, the
directory text RAG, and the per-account/global caps. Until those exist, the
assistant cannot accept listener photos.

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
- Media retrieval is free-tier only: no Cloudflare AI Search, Cloudflare Images,
  paid transform API or paid-billing model. Private/unpublished media is never
  embedded; the shared index carries public listing media only.
- Prompt size budget: tune top-K per domain; do not dump full catalogs when
  vector search is available.
- Sanitization: never put personal, payment, or provider (Conekta) data into
  prompts that train vendor models; keep prompts to the owner's own needed slice.

## Open questions

- Daily caps (per-account and global) and auto-cutoff thresholds (Level 1 guard).
- Media index: 512 vs 256 dimensions, OCR only for flyers vs on-demand OCR, and
  the exact daily Neuron budget split between embeddings and chat.
- Listener image queries: visual-match confidence threshold and how to present a
  doubtful match; max image size/format; per-IP limits; whether a short-TTL
  result cache by hash is acceptable; and the exact vision-query budget.
- Media moderation before indexing: photos can contain people, plates or private
  interiors; decide the rejection/review rule for public indexing.
- Whether image results render inline in chat or as links to the listing.
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
- `packages/api/src/server/routers/support/index.ts` — `support.chat` router,
  `buildCatalog`, system prompts.
- `packages/api/src/server/worker.ts` — wiring, `PLAN_VECTORS`, `AI_GATEWAY_ID`.
- `packages/api/README.md` — retrieval and Vectorize/AI Gateway setup.
- `packages/db/src/schema/` — domain tables split by domain: `accounts.ts`,
  `plans.ts`, `billing.ts` (subscriptions, payments, invoices), `directory.ts`
  (businesses, services, products, hours), `media.ts` (photos, flyers), `radio.ts`.
