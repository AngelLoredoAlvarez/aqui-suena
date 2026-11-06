# Spec: memberships — Aquí Suena (by 17Labs)

## Objective

Three business plans for Aquí Suena owners, billed by 17Labs: **Comunidad** (free), **Oficios & Servicios** (paid, intermediate), and **Comercios & Catálogo** (paid, top). Radio playback remains independent from business monetization: plan visibility and monetization happen through the visual ads carousel and business directory. Owners subscribe in owner-portal; enforcement applies in business-directory and ads-display. Success = plan limits and carousel priority are automatic, with no manual gating.

## Plan definitions

### Comunidad — free

For any person or business that wants basic presence and direct contact.

**Business limit:** 1 business per account.
**Allowed business types:** contacto only.

Card description: advertise a business at no cost and join the regional directory.

Includes:
- Direct contact details: WhatsApp, phone, and address.
- One basic flyer in the visual carousel rotation, replaceable only every 15 days.
- Quick open/closed status indicator.
- Exact-location map button.

Carousel behavior: standard/low community rotation: 1 appearance per cycle.

### Oficios & Servicios — paid intermediate

**Price:** $49 MXN/month or $490 MXN/year.

For service providers of any profession: electricians, plumbers, dentists, lawyers, educators and more.

**Business limit:** 3 businesses per account.
**Allowed business types:** contacto and servicios.

Card description: show professional experience and reach more clients with a profile designed for home-service work.

Includes:
- Universal contact details.
- Higher carousel frequency and visual priority than Comunidad.
- Profile specialties, coverage area, and up to 30 offered services per business with optional base diagnostic rates.
- Gallery of up to 10 previous jobs per business, with up to 3 photos per job.
- "Urgencias / 24 Horas" badge.

Carousel behavior: 2 appearances per cycle, focused on reminders and trust by specialty.

### Comercios & Catálogo — paid top

**Price:** $99 MXN/month or $990 MXN/year.

For established businesses that sell products or catalogs: hardware stores, restaurants, boutiques and more.

**Business limit:** 10 businesses per account.
**Allowed business types:** contacto, servicios and catálogo.

Card description: stand out with a complete digital storefront where listeners can explore everything the business sells.

Includes:
- Universal contact details.
- Maximum carousel priority and featured rotation.
- Digital catalog ordered by categories with up to 50 products per business, reference prices, and up to 3 photos per product.
- Featured product/dish.
- Social-media links.
- Icons for accepted payment methods.

Carousel behavior: 3 appearances per cycle, focused on visual impact and category-based catalog exploration.

## Tech Stack

- Web: React + Next.js (App Router) + React Native Web
- Native: React Native + Expo (managed, owners mostly on web)
- Navigation: TBD — `/owner/billing`. `packages/navigation` reserved; no Solito installed.
- UI: Tamagui (three plan cards, current-plan badge)
- Data: tRPC + TanStack Query, Conekta for subscriptions (cards/cash/SPEI, MXN)
- DB: Drizzle + D1/SQLite (`plans`, `subscriptions`, `payments`, `invoices`); entitlements are domain data, not a table
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
packages/db/src/schema.ts                 → plans, subscriptions, payments, invoices tables
packages/api/src/server/routers/billing/plans.ts  → plans.list (tRPC)
packages/api/src/domain/billing/          → entitlements, plans, subscriptions, payments domain logic
packages/api/src/infrastructure/billing/  → D1 repositories (plan, subscription, payment, invoice)
packages/ui/src/plan-card.tsx             → three-plan comparison + current-plan badge (planned)
apps/web/app/owner/billing/page.tsx       → billing route (web-first, planned)
```

## Code Style

Entitlements as data, not conditionals scattered in UI:

```tsx
// Rotation frequency: Comunidad 1, Oficios 2, Comercios 3 appearances per cycle.
export const ENTITLEMENTS = {
  comunidad: {
    maxBusinesses: 1, // Comunidad only; Oficios = 3; Comercios = 10
    flyerImages: 1,
    catalog: false,
    carouselPriority: 0,
  },
  oficios: {
    specialties: true,
    coverageArea: true,
    workGallery: true,
    urgencyBadge: true,
    diagnosticRates: true,
    carouselPriority: 10,
  },
  comercios: {
    catalog: true,
    catalogCategories: true,
    featuredProduct: true,
    socialLinks: true,
    paymentMethods: true,
    carouselPriority: 20,
  },
} as const;
export type PlanId = keyof typeof ENTITLEMENTS;
```

Conventions: single `entitlements.get(accountId)` resolver per account consumed by directory and ads; never re-implement limits per screen. Plan IDs are stable lowercase keys; display names and card copy come from the i18n dictionary.

## Testing Strategy

- Framework: Vitest; integration via tRPC caller.
- Locations: `packages/api/src/domain/billing/*.test.ts`, `packages/api/src/infrastructure/billing/*.test.ts`, `packages/api/src/server/routers/billing/plans.test.ts`.
- Coverage: 100% on entitlement matrix and downgrade/upgrade transitions across all three plans.
- Levels: unit (limits per plan) → integration (subscription change propagates to listing and carousel within 1 min).

## Boundaries

- Always: enforce limits server-side, show an upgrade CTA when a plan limit is hit, audit plan changes.
- Always: store `termsAcceptedVersion + termsAcceptedAt` per Account from signup acceptance and link the same terms from plan/billing screens; copy via i18n dictionary, no hardcoded strings.
- Always: require an unchecked-by-default recurring-charge authorization checkbox on every paid signup and plan change (`/owner/billing`) disclosing amount, frequency, currency, no trial, automatic renewal, the 7-day failed-renewal grace with email warning, and how to cancel; `subscriptions.create` and plan-change mutations reject without it; store `subscriptionAcceptedVersion + subscriptionAcceptedAt` per Account and always issue a receipt; copy via i18n dictionary, no hardcoded strings.
- Always: gate plan changes (including downgrade picker) behind explicit user confirmation listing affected limits/items with destructive defaults off; copy via i18n dictionary, no hardcoded strings.
- Always: extend the append-only activity audit log (actor, action, entity, timestamp) to plan changes and recurring-charge authorizations and surface them in the visible activity section; log is immutable and never user-editable.
- Ask first: change prices/limits, switch payment provider, grant manual exceptions, change ranking weights.
- Never: enforce limits only in UI, allow Comunidad listings to claim paid carousel priority, render a plan-tier badge in the public directory card or sheet (carousel priority is applied silently in ranking), or allow more than one active subscription per account. The Oficios "Urgencias / 24 Horas" badge is a service attribute, not a plan-tier badge.

## Success Criteria

- Comunidad's single flyer can be replaced only after 15 days; attempts return a typed `FLYER_REPLACEMENT_COOLDOWN` error with the next allowed replacement date. Paid plans have no flyer replacement cooldown.
- Oficios & Servicios: specialties, coverage area, up to 30 offered services with optional base diagnostic rates, previous-work gallery (up to 10 jobs with 3 photos each), urgency badge, and base diagnostic rates; higher carousel priority than Comunidad; 3 businesses per account.
- Comercios & Catálogo: categorized catalog with up to 50 products, reference prices, up to 3 photos per product, featured product/dish, social links, and accepted-payment icons; highest carousel priority; 10 businesses per account.
- Ranking is deterministic: Comercios & Catálogo (20) > Oficios & Servicios (10) > Comunidad (0), with recency as tie-breaker. Frequency is 1/2/3 appearances per cycle respectively; selection interleaves businesses to avoid consecutive repeats while respecting each plan's allocated appearances.
- Downgrade (manual, or automatic after the 7-day failed-renewal grace with email warning) applies limits within 1 minute without data loss (excess content hidden, not deleted); hidden content is retained for 90 days before permanent deletion. Plan changes are immediate on upgrade and scheduled for the end of the paid period on downgrade; V1 does not prorate charges. Cancellation stops renewal but keeps the paid plan active until the end of the billing period; V1 does not issue partial refunds for unused time. Failed renewals use the 7-day grace period with email warning before downgrade.
- Every paywalled action returns a typed `UPGRADE_REQUIRED` error the UI maps to billing.
- Paid plans are billed in MXN via Conekta with no trial period (Comunidad is the free entry point): Oficios & Servicios costs $49 MXN/month or $490 MXN/year; Comercios & Catálogo costs $99 MXN/month or $990 MXN/year. Annual billing is promoted as 10 months paid for 12 months of service.
- Each account has at most one active subscription at any time; upgrades and downgrades replace the previous active subscription rather than creating a second active one.
- The previous Premium plan at $159 MXN/month is discontinued; its price is not grandfathered into the new three-plan model. No account migration is required because no accounts are registered yet.
- Plan screens show all three cards with i18n copy. Onboarding asks for `businessProfile` and preselects the corresponding recommendation: local community business → Comunidad, home services/trades → Oficios & Servicios, catalog-based commerce → Comercios & Catálogo. The user can change plans before confirming; an unanswered profile defaults to Comunidad.
- Plan metadata, pricing and entitlements are stored in D1 and exposed through `plans.list()` / `plans.getById()`; `ENTITLEMENTS` remains the technical source of plan limits.
- Audio radio spots are not included in any current plan. The feature remains in the codebase/specs for future use but is disabled behind a feature flag; no current entitlement enables it.
- Support is plan-tiered: Comunidad uses self-service help plus standard email support; Oficios & Servicios gets prioritized email support; Comercios & Catálogo gets a dedicated support channel for catalog, payment, and operational issues.
- Stats availability by tier: Comunidad sees ad impressions, business visits, and basic contact clicks; Oficios & Servicios adds action clicks, gallery views, and service conversions; Comercios & Catálogo adds product views, product clicks, top product, category views, and date-range exports.
- Flyer ownership is business-scoped: every business has exactly one flyer, even when multiple businesses share the same account. The account controls permissions and billing only; public data always belongs to the business.
- Featured placements are an optional temporary upsell, not a replacement for plan priority. They are clearly labeled, time-boxed, capacity-limited, and never remove a paid plan's baseline carousel weight or allocated appearances. Comercios & Catálogo may include preferred featured benefits such as a monthly free featured slot or discounted featured purchases.
- Catalog categories for Comercios & Catálogo are a controlled shared enum with i18n display names; owners cannot create arbitrary categories.
- Plan upgrade prompts are contextual: they appear only when an action hits a plan limit, explain the specific benefit of the next tier, include a clear "Ver planes"/"View plans" action, and do not repeat within the same session.
- Billing issues a receipt for every charge in MXN; fiscal invoices (CFDI) are available on request. Plan, amount, and billing period remain visible in account history.
- The billing/pricing page shows three aligned plan cards first, followed by a secondary comparison table grouped by usage, features, visibility, support, stats, and billing.
- The billing page defaults to annual billing with a monthly/annual toggle, highlights the annual savings as "2 meses gratis", and allows changing the billing period before payment.
- The system sends renewal and expiration reminders: 7 days before charge, 1 day before charge, immediately on failed payment, and when a plan downgrades; non-critical reminders can be disabled by the owner.
- Abuse prevention for the free plan requires email verification, phone verification before publishing, duplicate-account detection by email/phone/device, and manual review for suspicious signup patterns.
- Owner onboarding uses an informational, non-blocking checklist: business name/category, phone/WhatsApp, address/hours, flyer upload, open/closed status, and plan-specific services/gallery/catalog steps. Steps are marked automatically and the checklist can be hidden when complete.

## Open Questions

None.
