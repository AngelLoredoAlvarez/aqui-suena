# Spec: owner-portal — Aquí Suena for Business (by 17Labs)

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
DB push (dev): pnpm --filter @aqui-suena/db db:push
```

## Project Structure
```
apps/web/app/owner/page.tsx              → dashboard
apps/web/app/owner/listings/page.tsx     → CRUD listings
apps/web/app/owner/media/page.tsx        → photo uploads
packages/api/src/routers/owner.ts        → owner.createListing / updateListing / uploadPhoto
packages/ui/src/listing-form.tsx         → shared form (valibot-driven)
```

## Code Style
One schema drives form + API:

```tsx
// packages/api/src/schemas/listing.ts
import * as v from 'valibot';
export const ListingSchema = v.object({
  name: v.pipe(v.string(), v.minLength(2)),
  category: v.picklist(['food', 'clothing', 'computing']),
  phones: v.pipe(v.array(v.string()), v.minLength(1)),
  address: v.pipe(v.string(), v.minLength(5)),
  hours: v.array(v.object({ day: v.number(), open: v.string(), close: v.string() })),
  delivery: v.optional(v.boolean(), false),
});
export type ListingInput = v.InferOutput<typeof ListingSchema>;
```

Conventions: image upload via signed URLs; preview before publish; every mutation revalidates entitlements.
Contract note: ListingSchema `delivery` boolean stays; help text states true means the owner offers own transport; fulfillment is coordinated off-app via listed phone/WhatsApp + address; no logistics in V1.
Contract note: the `delivery` toggle maps to a conditional listener-side flag (rendered only when true, absent when false with no negative badge) via i18n dictionary: ES "Servicio a domicilio" / EN "Home delivery", no hardcoded UI copy.

## Testing Strategy
- Framework: Vitest + Testing Library + headed Playwright for the owner happy path.
- Locations: `packages/ui/src/listing-form.test.tsx`, e2e `apps/web/e2e/owner.spec.ts`.
- Coverage: 100% on ListingSchema and entitlement rejections.
- Levels: unit (schema) → integration (create→publish→visible in directory) → e2e (owner publishes photo + hours, listener sees it).

## Boundaries
- Always: require Supabase Auth + business ownership checks (short-lived JWT in Authorization Bearer for tRPC with server-side verification), validate with valibot, compress photos client-side before R2 upload, run `typecheck + lint + test` before commit.
- Always: require an unchecked-by-default T&C + privacy-notice acceptance checkbox with links on signup (`/owner/access` Crear cuenta); `create-account` rejects without acceptance and plan/billing screens link the same terms; copy via i18n dictionary, no hardcoded strings.
- Always: restrict owner accounts to adults 18+ with contractual capacity (V1, no tutor/guardian path, no ID upload); `/owner/access` collects birthdate plus an unchecked-by-default 18+ attestation checkbox; `create-account` validates age server-side (18+) with valibot and rejects underage or missing attestation with a typed error without creating the account; birthdate is immutable after signup (support-only change with audit log); PREMIUM additionally requires the Conekta payment method holder to match the account holder; copy via i18n dictionary, no hardcoded strings.
- Always: gate every important-data change (giro switch clearing product fields, hours/address edits, deletions of products/photos/spots/businesses) behind explicit user confirmation listing affected items with destructive defaults off; copy via i18n dictionary, no hardcoded strings.
- Always: record an append-only activity audit log (actor, action, entity, timestamp) in DB covering edits, publishes, uploads, deletes, T&C acceptance, and 18+ age attestation (including support-only birthdate changes), plus a visible owner activity section in the portal UI; log is immutable and never user-editable; copy via i18n dictionary, no hardcoded strings.
- Ask first: add a listing field, allow multiple branches per owner, enable native editing.
- Never: let one owner edit another listing, publish without entitlement check, store raw uploads without virus/size guards.

## Success Criteria
- Owner completes signup → listing → publish in <10 minutes unaided (headed e2e).
- Photos render on listener sheet in <2s on 4G.
- Hours saved here drive correct open/closed in directory immediately.
- Free-plan caps show inline upgrade hints, never silent failures.
- Premium owners get an in-app suggestions/feedback channel to 17 Labs (design pending with Claude Design).
- Auth provider is Supabase Auth (supersedes prior email-only OTP text where it contradicts). Enabled methods: Google, Facebook, email/password, OTP. Free-tier note: 50k MAU included.
- Web (Next.js App Router): session via `@supabase/ssr` cookie helpers with httpOnly, secure, sameSite cookies; secrets via env only; redirect/callback allowlists per provider.
- Native (Expo): session via SecureStore adapter; OAuth callback via custom-scheme deep link with dev build (auth.expo.io proxy deprecated); secrets via env only; redirect/callback allowlists per provider.
- tRPC: client sends short-lived JWT in Authorization Bearer; server verifies with Supabase before ownership checks.
- Provider-console prerequisites (pending): Google and Meta developer apps with allowlisted redirects.
- Email OTP (short expiry, attempt limits, single use) covers both account verification and password recovery; a password change closes other sessions. Owner verification requires no manual business review before publishing.
- Plan-change screens include a downgrade business-picker step (owner chooses the visible business) and a grace-period banner during the 7-day failed-renewal window.

## Future: owner support chatbot (deferred, decided 2026-10-15, updated 2026-10-23)

Owner-facing support assistant for payment and account help (card, OXXO, SPEI, receipts, failed payments, plan changes, downgrade). Strategy is two levels, decided to stay 100% free for now:

- Level 0 (rule-based, no backend): client-side intents + matcher + i18n responses in a shared package; simple chat UI in the owner portal; colocated matcher tests; honest fallback to human support. Doubles as the free-tier fallback later.
- Level 1 (deferred): tRPC `support.chat` behind Supabase Auth with per-account daily caps, Cloudflare Workers AI (free: 10k neurons/day) as the evaluated provider, optional `support.feedback` logging of unresolved queries to discover intents. Hard guards before any build: server-side restricted key only, per-account + global daily caps with auto-cutoff, sanitized prompts (never personal, payment, or Conekta data — free-tier content trains vendor models), provider abstraction for swap (Groq/OpenRouter), explicit fallback to level 0 on 429/overload.

Cloudflare Workers AI free-tier models: Llama 3.1 8B (general), Mistral 7B (multilingual). Recommendation: Llama 3.1 8B for Spanish/English support queries.

## Open Questions
- Image hosting provider for uploads (per-plan photo limits decided in SPEC-memberships)?
