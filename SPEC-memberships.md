# Spec: memberships — Aquí Suena (by 17Labs)

## Objective

Free vs Premium plans for Aquí Suena business owners, billed by 17Labs. Free registers basic business info plus flyer only with zero structured products; Premium unlocks the full product listing plus carousel priority and radio-spot eligibility. Users: owners subscribe in owner-portal; enforcement applies in business-directory, ads-display, and radio-spots. Success = limits are automatic, no manual gating.

## Tech Stack

- Web: React + Next.js (App Router) + React Native Web
- Native: React Native + Expo (managed, owners mostly on web)
- Navigation: TBD — `/owner/billing`. `packages/navigation` reserved; no Solito installed.
- UI: Tamagui (plan cards, entitlement badges)
- Data: tRPC + TanStack Query, Conekta for subscriptions (cards/cash/SPEI, MXN)
- DB: Drizzle + PostgreSQL (`plans`, `subscriptions`, `entitlements`)
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
packages/db/src/schema.ts                 → plans, subscriptions
packages/api/src/routers/billing.ts       → plans.list / subscriptions.create / entitlements.get (per account)
packages/ui/src/plan-card.tsx             → plan comparison + current-plan badge
apps/web/app/owner/billing/page.tsx       → billing route (web-first)
```

## Code Style

Entitlements as data, not conditionals scattered in UI:

```tsx
// packages/api/src/entitlements.ts
export const ENTITLEMENTS = {
  free: {
    maxBusinesses: 1,
    products: 0,
    media: "flyer+logo",
    priority: 0,
    spotEligible: false,
    delivery: true,
  },
  premium: {
    products: 100,
    photosPerProduct: "1-3",
    photoMaxMB: 2,
    priority: 10,
    spotEligible: true,
    delivery: true,
  }, // open business count: no maxBusinesses cap
} as const;
export type PlanId = keyof typeof ENTITLEMENTS;
```

Conventions: single `entitlements.get(accountId)` resolver per account (`maxBusinesses` applies to Free only; Premium has an open business count) consumed by directory/ads/spots; never re-implement limits per screen.

## Testing Strategy

- Framework: Vitest; integration via tRPC caller.
- Locations: `packages/api/src/entitlements.test.ts`, `packages/api/src/routers/billing.test.ts`.
- Coverage: 100% on entitlement matrix and downgrade/upgrade transitions.
- Levels: unit (limits per plan) → integration (subscription change propagates to listing/spots within 1 min).

## Boundaries

- Always: enforce limits server-side, show upgrade CTA when a free limit is hit, audit plan changes.
- Always: store `termsAcceptedVersion + termsAcceptedAt` per Account from signup acceptance and link the same terms from plan/billing screens; copy via i18n dictionary, no hardcoded strings.
- Always: require an unchecked-by-default recurring-charge authorization checkbox on every PREMIUM signup and plan change (`/owner/billing`) disclosing amount, frequency, currency, no trial, automatic renewal, the 7-day failed-renewal grace with email warning, and how to cancel; `subscriptions.create` and plan-change mutations reject without it; store `subscriptionAcceptedVersion + subscriptionAcceptedAt` per Account and always issue a receipt; copy via i18n dictionary, no hardcoded strings.
- Always: gate plan changes (including downgrade picker) behind explicit user confirmation listing affected limits/items with destructive defaults off; copy via i18n dictionary, no hardcoded strings.
- Always: extend the append-only activity audit log (actor, action, entity, timestamp) to plan changes and recurring-charge authorizations and surface them in the visible activity section; log is immutable and never user-editable.
- Ask first: change prices/limits, switch payment provider, grant manual exceptions.
- Never: enforce limits only in UI, allow free listings to claim spot eligibility or carousel priority, allow free listings to create structured products, render a plan-tier badge in the public directory card or sheet (carousel priority is applied silently in ranking).

## Success Criteria

- Free (1 business per account): basic listing (name, category, phone, address, hours, delivery flag) plus flyer + logo only, zero structured products, no spot, normal carousel weight.
- Premium (open business count, multiple businesses per account): full catalog (up to 100 products, 1-3 photos each, 2MB max per photo in JPG/PNG/WebP with client-side compression), extended hours, carousel priority (applied silently in ranking, never shown as a badge in the public directory card/sheet), spot eligible (delivery flag included as in Free).
- Delivery flag (both plans): owner-declared operational data, informational contact handoff only; no fees, zones, dispatch, or tracking in V1.
- Downgrade (manual, or automatic after the 7-day failed-renewal grace with email warning) applies limits within 1 minute without data loss (owner picks the visible business, excess hidden, not deleted).
- Every paywalled action returns a typed `UPGRADE_REQUIRED` error the UI maps to billing.
- Premium is $159 MXN/month flat per account (open business count, no per-business cap; per-business media caps already bound costs; revisit per-volume pricing when a big account appears) via Conekta with no trial period (Free is the trial); all money in MXN, no multi-currency in V1.
- Plan screens preselect Premium with a Recomendado badge via i18n dictionary (ES "Recomendado" / EN "Recommended"), no hardcoded UI copy; Free stays one tap away.
- Stats basics (carousel views + detail visits) ship on both plans; full stats (spot plays + per-product views) are Premium-only.

## Open Questions

- Premium $159 MXN/month flat-per-account validation, and per-volume pricing revisit trigger when a big account appears, against real conversion and billing data?
