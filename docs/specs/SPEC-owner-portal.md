# Spec: owner-portal — Aquí Suena for Business (by 17Labs)

> **Status: partial (2026-11-18).** The directory and billing procedures the portal consumes are implemented in `packages/api` — including account deletion, CFDI issuing with email delivery, invoice history with signed downloads and cancellation with motives `01` (substitution), `02` and `03` — and lazy account provisioning means a first authenticated request already has its `accounts` row. No `/owner` route, form or billing view exists in `apps/web` yet: the only page there is the landing player.

## Objective

Aquí Suena for Business (by 17Labs): web-first portal where business owners create and maintain everything listeners see in Aquí Suena: products + prices, product photos (when applicable), working hours, phones, emails (when applicable), home-delivery flag (when applicable), and category. Gated by memberships. Users: verified owners. Success = an owner can go from signup to live listing without support.

## Tech Stack

- Web: React + Next.js (App Router) (portal is web-first; native read-only)
- Native: n/a for editing (owners use web)
- Navigation: TBD — `/owner`, `/owner/listings`, `/owner/billing`. `packages/navigation` reserved; no Solito installed.
- UI: Tamagui (forms, uploads, schedules)
- Data: tRPC + TanStack Query + React Hook Form + valibot resolvers
- Auth: Supabase Auth (Google, Facebook, email/password, OTP; 50k MAU free tier)
- DB: Drizzle + SQLite/D1 (same `businesses` tables as directory)
- Storage: Cloudflare R2 for photo uploads (presigned PUT, see SPEC-media-storage)
- Language: TypeScript strict
- Lint/format: Biome (replaces ESLint + Prettier)

## Commands

```
Dev web: pnpm --filter web dev
Build: pnpm -r build
Test: pnpm -r test -- --run
Lint: pnpm exec biome check --write .
Typecheck: pnpm -r typecheck
DB migrations: pnpm --filter @aqui-suena/db db:generate, then pnpm --filter @aqui-suena/api exec wrangler d1 migrations apply <db> --remote
```

## Project Structure

```
apps/web/app/owner/page.tsx              → dashboard
apps/web/app/owner/listings/page.tsx     → CRUD listings
apps/web/app/owner/media/page.tsx        → photo uploads
packages/api/src/routers/owner.ts        → owner.createListing / updateListing / uploadPhoto
packages/ui/src/listing-form.tsx         → shared form (valibot-driven)
```

## Media and document viewer (planned)

The owner app must let a client **view photos and flyers, open invoice PDFs and
preview a spot's audio** without leaving the session. The media, photo, flyer and
invoice procedures exist; spot management and the viewer UI do not. This section
is the contract for that viewer.

### Data and reads

- **Photos:** `photos.listByBusiness` / `photos.getById` return a `url` resolved
  to a short-lived signed URL when the row has `mediaId`; legacy rows return
  their stored URL. These public reads only cover a visible business. The owner
  gallery should also work for a hidden or unpublished business: use
  `media.list` + `media.signedUrl` for the owner's rows, and add an owner-scoped
  photo read if the gallery needs the photo metadata. Uploads use
  `media.presignUpload` → direct R2 PUT → `media.confirm` → `photos.create` with
  `mediaId`.
- **Flyers:** the same write flow through `flyers.create`. The public
  `flyers.list`/`flyers.getById` reads are visibility-filtered; the owner preview
  for a hidden business needs the owner-scoped path described above or the media
  row's signed URL.
- **Invoices:** `billing.invoices.list` and `billing.invoices.downloadUrl`
  already return a 300-second signed URL with the CFDI filename and the right
  content type for `pdf` and `xml`. The viewer consumes those procedures; it
  never reads R2 directly and never proxies the bytes through the Worker.
- **Spots:** the planned `/owner/spots` flow uses the media pipeline with
  `kind: "spot-audio"` and `media.signedUrl` for the owner preview. The spot
  entitlement is exclusive to Comercios & Catálogo and the flag is off until
  launch; until then the screen shows the plan gate.

### Libraries and tools

| Need                                     | Tool                                                                      | Status                              |
| ---------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------- |
| Lazy signed image with blur placeholder  | `@aqui-suena/ui/optimized-image` (Tamagui `Image` + IntersectionObserver) | installed                           |
| Server data and signed-URL caching       | `@tanstack/react-query`                                                   | installed                           |
| Native audio preview                     | `expo-audio`                                                              | installed (also used by the player) |
| Client image resize/compression (web)    | `browser-image-compression` or Canvas API                                 | candidate                           |
| Client image resize/compression (native) | `expo-image-manipulator`                                                  | candidate                           |
| PDF viewer (web/Tauri)                   | `react-pdf` (`pdfjs-dist` worker), lazily imported                        | candidate                           |
| PDF fallback (native/any)                | `expo-web-browser` / system viewer opened with the signed URL             | candidate                           |
| Optional waveform for spot preview       | `wavesurfer.js` (web only)                                                | optional                            |
| Server-side variants (AVIF/WebP/srcset)  | Cloudflare Image Resizing                                                 | rejected: zero-cost rule            |
| Free server-side variants                | `@jsquash/webp` / `wasm-image-optimization` in a Worker                   | candidate; CPU-bound                |

Rules: lazy-load the PDF bundle only when the viewer opens; use a single audio
instance and stop it on close; never render an invoice or media object from a
long-lived URL. All viewer and optimization tooling must stay on free tiers;
paid image services are excluded.

### Performance rules

- **Images:** compress before upload (max edge 1920 px, quality ~0.8, WebP when
  the encoder is available); use the `OptimizedImage` lazy path above the fold
  only with `priority`; reserve layout size; show the blur placeholder; prefer a
  thumbnail grid and fetch the full object only when the item opens. Without a
  variant pipeline, do not claim `srcset`; the plan is either client-generated
  thumbnails or a free Worker WASM pipeline, never a paid service.
- **PDFs:** the CFDI PDF is small (~55 KB); open it in a modal/viewer, fetch on
  demand, and keep the signed URL only for the session. No list prefetch of all
  PDFs; no full-document download for a thumbnail.
- **Audio:** stream the signed URL with `preload="metadata"`, no transcode, stop
  on close. The 30-second cap is enforced at `confirm`; the preview never
  replaces the listener's spot rotation.
- **Caching:** media keys are immutable, so the browser/native image cache can be
  long-lived; signed URLs expire in 300 seconds and are re-requested instead of
  persisted. The gallery must not block audio playback.

## Code Style

One schema drives form + API:

```tsx
// packages/api/src/schemas/listing.ts
import * as v from "valibot";
export const ListingSchema = v.object({
  name: v.pipe(v.string(), v.minLength(2)),
  category: v.picklist(["food", "clothing", "computing"]),
  phones: v.pipe(v.array(v.string()), v.minLength(1)),
  address: v.pipe(v.string(), v.minLength(5)),
  hours: v.array(v.object({ day: v.number(), open: v.string(), close: v.string() })),
  delivery: v.optional(v.boolean(), false),
});
export type ListingInput = v.InferOutput<typeof ListingSchema>;
```

Conventions: image upload via signed URLs; preview before publish; every mutation revalidates entitlements.
Contract note: ListingSchema `delivery` boolean stays; help text states true means the owner offers own transport; fulfillment is coordinated off-app via listed phone/WhatsApp + address; no logistics in V1.
Contract note: phone values use E.164 (`+` followed by 2-15 digits, first digit 1-9); malformed values are rejected by the shared listing schema.
Contract note: the `delivery` toggle maps to a conditional listener-side flag (rendered only when true, absent when false with no negative badge) via i18n dictionary: ES "Servicio a domicilio" / EN "Home delivery", no hardcoded UI copy.
Contract note: Comercios & Catálogo catalog categories are a controlled shared enum with i18n display names; owners cannot create arbitrary categories.

## Testing Strategy

- Framework: Vitest + Testing Library + headed Playwright for the owner happy path.
- Locations: `packages/ui/src/listing-form.test.tsx`, e2e `apps/web/e2e/owner.spec.ts`.
- Coverage: 100% on ListingSchema and entitlement rejections.
- Levels: unit (schema) → integration (create→publish→visible in directory) → e2e (owner publishes photo + hours, listener sees it).

## Boundaries

- Always: require Supabase Auth + business ownership checks (short-lived JWT in Authorization Bearer for tRPC with server-side verification), validate with valibot, compress photos client-side before R2 upload, run `typecheck + lint + test` before commit.
- Always: upload business media through `media.presignUpload`/`media.confirm` with the business scope, preview it through `media.signedUrl` (owner), and link `photos`/`flyers` through `mediaId` instead of accepting arbitrary URLs; public reads are signed server-side for visible listings. The R2 key layout, signed reads and lifecycle are in `odd/tasks/feat-owner-media-r2.md`.
- Always: require an unchecked-by-default T&C + privacy-notice acceptance checkbox with links on signup (`/owner/access` Crear cuenta); `create-account` rejects without acceptance and plan/billing screens link the same terms; copy via i18n dictionary, no hardcoded strings.
- Always: restrict owner accounts to adults 18+ with contractual capacity (V1, no tutor/guardian path, no ID upload); `/owner/access` collects birthdate plus an unchecked-by-default 18+ attestation checkbox; `create-account` validates age server-side (18+) with valibot and rejects underage or missing attestation with a typed error without creating the account; birthdate is immutable after signup (support-only change with audit log); paid plans additionally require the Conekta payment method holder to match the account holder; copy via i18n dictionary, no hardcoded strings.
- Always: create the `accounts` row lazily on the first authenticated request (`createContext`), keyed by `app_metadata.account_id ?? user.id`, with the session email trimmed and lowercased. The row is the foreign-key anchor for owned data; the signup profile (birthdate, T&C acceptance, 18+ attestation) is written later by `create-account`. The session email is re-synced when it changes, and `billing_email` is never touched. Details: `odd/tasks/feat-account-provisioning.md`.
- Always: let the owner erase their own account with no admin in the middle. Deletion removes the login first, then media objects and rows, then businesses with their children, and leaves an anonymized `accounts` row (`deleted-<id>@deleted.invalid`, fiscal columns cleared, `deleted_at` set) because `subscriptions`, `payments` and `cfdi_invoices` are kept for fiscal retention. The freed email must be able to sign up again, and scheduled senders must skip tombstones. Details: `odd/tasks/feat-account-deletion.md`.
- Always: gate every important-data change (giro switch clearing product fields, hours/address edits, deletions of products/photos/spots/businesses) behind explicit user confirmation listing affected items with destructive defaults off; copy via i18n dictionary, no hardcoded strings.
- Always: record an append-only activity audit log (actor, action, entity, timestamp) in DB covering edits, publishes, uploads, deletes, T&C acceptance, and 18+ age attestation (including support-only birthdate changes), plus a visible owner activity section in the portal UI; log is immutable and never user-editable; copy via i18n dictionary, no hardcoded strings.
- Ask first: add a listing field, allow multiple branches per owner, enable native editing.
- Never: let one owner edit another listing, publish without entitlement check, store raw uploads without virus/size guards.

## Success Criteria

- Owner completes signup → listing → publish in <10 minutes unaided (headed e2e).
- Owner onboarding collects `businessProfile` (community business, home services/trades, or catalog-based commerce) and uses it to preselect the recommended plan without blocking a manual plan change; missing answers default to Comunidad.
- Owner forms expose plan-specific fields: Comunidad contact/flyer/location; Oficios & Servicios specialties, coverage area, work gallery, urgency badge, and diagnostic rates; Comercios & Catálogo categorized catalog, featured product/dish, social links, and accepted-payment icons.
- Photos render on listener sheet in <2s on 4G.
- Hours saved here drive correct open/closed in directory immediately.
- Comunidad-plan caps show inline upgrade hints, never silent failures.
- Oficios & Servicios and Comercios & Catálogo owners get an in-app suggestions/feedback channel to 17 Labs (design pending with Claude Design).
- Auth provider is Supabase Auth (supersedes prior email-only OTP text where it contradicts). Enabled methods: Google, Facebook, email/password, OTP. Free-tier note: 50k MAU included.
- Web (Next.js App Router): session via `@supabase/ssr` cookie helpers with httpOnly, secure, sameSite cookies; secrets via env only; redirect/callback allowlists per provider.
- Native (Expo): session via SecureStore adapter; OAuth callback via custom-scheme deep link with dev build (auth.expo.io proxy deprecated); secrets via env only; redirect/callback allowlists per provider.
- tRPC: client sends short-lived JWT in Authorization Bearer; server verifies with Supabase before ownership checks.
- Provider-console prerequisites (pending): Google and Meta developer apps with allowlisted redirects.
- Email OTP (short expiry, attempt limits, single use) covers both account verification and password recovery; a password change closes other sessions. Owner verification requires no manual business review before publishing.
- Plan-change screens present Comunidad, Oficios & Servicios, and Comercios & Catálogo; downgrade flows list every affected field/content item (gallery, specialties, coverage area, urgency badge, diagnostic rates, categorized catalog, featured product, social links, and payment icons) and include a grace-period banner during the 7-day failed-renewal window.

## Future: owner support chatbot (deferred, decided 2026-10-15, updated 2026-10-23, prototyped 2026-11-03)

Scope is now defined in `SPEC-support-chatbot.md` (2026-11-04): read-only,
session-aware assistant covering plans (A), business directory (B), and the
owner's own business/invoices (D). No mutations; vector search for public
data, direct DB reads for owner-private data.

**Prototype (2026-11-03):** spike implemented in `packages/api` (`support.chat` router) using Cloudflare Workers AI (Llama 3.1 8B). Validated end-to-end: D1 plan catalog as RAG context, bilingual (es/en), prompt injection protection, fallback to Level 0 on error. V1 blockers remain: Supabase Auth, per-account/global daily caps, prompt sanitization (no personal/payment data).

**Retrieval upgrade (2026-11-04):** the full-catalog prompt injection was replaced by a `PlanCatalogRetriever` port. Default remains the full catalog; when the optional Vectorize binding is enabled (`aqui-suena-plan-catalog` index, `@cf/baai/bge-m3` embeddings, seeded via a token-guarded `POST /admin/seed-vectors`), the router injects only the top-K most similar plans and falls back to the full catalog on any failure. AI Gateway observability is likewise optional and free, routed by passing `{ gateway: { id } }` to `env.AI.run()` (the `[ai_gateway]` top-level wrangler field is not supported). Deployed model: `@cf/meta/llama-3.1-8b-instruct-fast` (the base `@cf/meta/llama-3.1-8b-instruct` was deprecated 2026-05-30). Scope: learning exercise on real data; the business directory remains the future high-value use for vector search.

Owner-facing support assistant for payment and account help (card, cash (Conekta Efectivo), SPEI, receipts, failed payments, plan changes, downgrade). Strategy is two levels, decided to stay 100% free for now:

- Level 0 (rule-based, no backend): client-side intents + matcher + i18n responses in a shared package; simple chat UI in the owner portal; colocated matcher tests; honest fallback to human support. Doubles as the free-tier fallback later.
- Level 1 (deferred): tRPC `support.chat` behind Supabase Auth with per-account daily caps, Cloudflare Workers AI (free: 10k neurons/day) as the evaluated provider, optional `support.feedback` logging of unresolved queries to discover intents. Hard guards before any build: server-side restricted key only, per-account + global daily caps with auto-cutoff, sanitized prompts (never personal, payment, or Conekta data — free-tier content trains vendor models), provider abstraction for swap (Groq/OpenRouter), explicit fallback to level 0 on 429/overload.

Cloudflare Workers AI free-tier models: Llama 3.1 8B (general), Mistral 7B (multilingual). Recommendation: Llama 3.1 8B for Spanish/English support queries.

## Open Questions

- **Owner-scoped media reads:** the public photo/flyer reads hide unpublished businesses. The viewer needs a protected owner list/get (or must key the gallery off `media.list` + `media.signedUrl`) before it can show a hidden business.
- **PDF viewer:** `react-pdf`/`pdfjs-dist` gives an in-app viewer but adds bundle weight; the system viewer via `expo-web-browser` is lighter but leaves the session. Decide per platform with the viewer bundle budget.
- **Image variants:** client-generated thumbnails or a free Worker WASM pipeline (`@jsquash`). Paid Cloudflare Image Resizing/Images is excluded by the zero-cost rule. Until one lands, `OptimizedImage` serves the original signed object with lazy loading, a blur placeholder and the native expo-image disk cache.
- **Spot preview:** `expo-audio` on native and `HTMLAudioElement` on web/Tauri are the baseline; a waveform (`wavesurfer.js`) is optional and must not delay the preview.
