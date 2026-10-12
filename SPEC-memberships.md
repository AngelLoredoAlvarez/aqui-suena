# Spec: memberships — Aquí Suena (by 17Labs)

## Objective
Free vs Monthly plans for Aquí Suena business owners, billed by 17Labs. Free registers basic business info plus flyer only with zero structured products; Monthly unlocks the full product listing plus carousel priority and radio-spot eligibility. Users: owners subscribe in owner-portal; enforcement applies in business-directory, ads-display, and radio-spots. Success = limits are automatic, no manual gating.

## Tech Stack
- Web: React + Next.js (App Router) + React Native Web
- Native: React Native + Expo (managed, owners mostly on web)
- Navigation: Solito (`/owner/billing`)
- UI: Tamagui (plan cards, entitlement badges)
- Data: tRPC + TanStack Query, Stripe (or regional provider) for subscriptions (TBD)
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
DB push (dev): pnpm --filter db db:push
```

## Project Structure
```
packages/db/src/schema.ts                 → plans, subscriptions
packages/api/src/routers/billing.ts       → plans.list / subscriptions.create / entitlements.get
packages/ui/src/plan-card.tsx             → plan comparison + current-plan badge
apps/web/app/owner/billing/page.tsx       → billing route (web-first)
```

## Code Style
Entitlements as data, not conditionals scattered in UI:

```tsx
// packages/api/src/entitlements.ts
export const ENTITLEMENTS = {
  free: { products: 0, photos: 3, priority: 0, spotEligible: false, delivery: true },
  monthly: { products: 100, photos: 30, priority: 10, spotEligible: true, delivery: true },
} as const;
export type PlanId = keyof typeof ENTITLEMENTS;
```

Conventions: single `entitlements.get(businessId)` resolver consumed by directory/ads/spots; never re-implement limits per screen.

## Testing Strategy
- Framework: Vitest; integration via tRPC caller.
- Locations: `packages/api/src/entitlements.test.ts`, `packages/api/src/routers/billing.test.ts`.
- Coverage: 100% on entitlement matrix and downgrade/upgrade transitions.
- Levels: unit (limits per plan) → integration (subscription change propagates to listing/spots within 1 min).

## Boundaries
- Always: enforce limits server-side, show upgrade CTA when a free limit is hit, audit plan changes.
- Ask first: change prices/limits, switch payment provider, grant manual exceptions.
- Never: enforce limits only in UI, allow free listings to claim spot eligibility or carousel priority, allow free listings to create structured products.

## Success Criteria
- Free: basic listing (name, category, phone, address, hours, delivery flag) plus flyer image, zero structured products, no spot, normal carousel weight.
- Monthly: full catalog (up to 100 products), photos, extended hours, carousel priority, spot eligible (delivery flag included as in Free).
- Delivery flag (both plans): owner-declared operational data, informational contact handoff only; no fees, zones, dispatch, or tracking in V1.
- Downgrade applies limits within 1 minute without data loss (excess items hidden, not deleted).
- Every paywalled action returns a typed `UPGRADE_REQUIRED` error the UI maps to billing.

## Open Questions
- Prices, currency, and trial policy?
- Payment provider (Stripe vs regional)?
- Grace period on failed renewal?
