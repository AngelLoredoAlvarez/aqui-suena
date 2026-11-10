# Spec: business-directory — Aquí Suena (by 17Labs)

## Objective

Single source of truth for Aquí Suena small-business listings (restaurants, clothing shops, etc.): name, category (food, computing, etc.), products with prices, product photos (when applicable), phone numbers, emails (when applicable), address, working hours, open/closed state, and home-delivery flag (when applicable). Users: owners edit via owner-portal; listeners read via ads-display sheets. Success = every paid listing renders complete, correct info without stopping audio.

## Tech Stack

- Web: React + Next.js (App Router) + React Native Web
- Native: React Native + Expo (managed)
- Navigation: TBD — routes `/business/[businessId]`. `packages/navigation` reserved; no Solito installed.
- UI: Tamagui (universal cards, sheets, image lists)
- Data: tRPC + TanStack Query (list/get with cache), valibot validation
- DB: Drizzle + SQLite/D1 (`businesses`, `services`, `products`, `photos`, `work_entries`, `flyers`, `hours`)
- Language: TypeScript strict
- Lint/format: Biome (replaces ESLint + Prettier)

## Commands

```
Dev web: pnpm --filter web dev
Dev mobile: pnpm --filter mobile start
Build: pnpm -r build
Test: pnpm -r test -- --run
Lint: pnpm exec biome check --write .
Typecheck: pnpm -r typecheck
DB push (dev): pnpm --filter @aqui-suena/db db:push
```

## Project Structure

```
apps/web/app/business/[businessId]/page.tsx → listing route (web)
apps/mobile/app/business/[businessId].tsx    → listing route (mobile)
packages/db/src/schema.ts                   → businesses, services, products, photos, work_entries, flyers, hours
packages/api/src/server/routers/directory/   → business.list / business.get + directory CRUD routers
packages/api/src/domain/directory/*.ts       → Business, Service, Product, Photo, WorkEntry, Flyer, Hour entities + InMemory repos + authorization/visibility guards
packages/api/src/infrastructure/directory/d1-*-repository.ts → D1 adapters for all 7 entities (full CRUD, hidden-parent filtering)
packages/ui/src/business-card.tsx            → shared card + sheet
```

## Code Style

Functional components, Tamagui primitives + tokens, `kebab-case` files, `PascalCase` components:

```tsx
// packages/ui/src/business-card.tsx
import { Card, Image, Text, YStack } from "tamagui";

// No router imports in shared code: the app wires onPress to its own router
// (next/link on web, expo-router on native). packages/navigation is reserved.
export function BusinessCard({
  name,
  category,
  open,
  onPress,
}: {
  name: string;
  category: string;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress}>
      <YStack padding="$3">
        <Text>{name}</Text>
        <Text>
          {category} · {open ? "Open" : "Closed"}
        </Text>
      </YStack>
    </Card>
  );
}
```

Conventions: valibot schemas shared between API and forms; hours stored as weekly ranges; `open` derived server-side from hours + now in the business timezone (stored IANA zone, never device time); no client-only open logic. Product photos stored on Cloudflare R2 (see SPEC-media-storage): presigned PUT upload, content-addressed keys, client-side compression (max 2MB, JPG/PNG/WebP), immutable cache.

## Testing Strategy

- Framework: Vitest + Testing Library; Playwright headed for sheet flows.
- Locations: `packages/api/src/server/routers/**/*.test.ts`, `packages/ui/src/*.test.tsx`, e2e `apps/web/e2e/business.spec.ts`.
- Coverage: 100% on open/closed derivation and price formatting.
- Levels: unit (hours→open, phone/address formatting) → integration (tRPC list/get) → e2e (open listing from carousel, audio keeps playing).

## Boundaries

- Always: validate listing inputs with valibot, derive `open` from hours, show delivery only when applicable, enforce auth and business ownership on mutations (short-lived JWT in Authorization Bearer, verified server-side; a missing or foreign resource answers `NOT_FOUND` and a malformed id answers `BAD_REQUEST`), run `typecheck + lint + test` before commit.
- Always: public reads (`list`, `getById`) and public child lists exclude businesses with `hidden_at` set; the owner still sees and edits them through the owner-scoped endpoints.
- Ask first: add a listing field, change hours model, add image hosting provider (now R2 — see SPEC-media-storage).
- Never: expose owner emails/phones to scrapers without rate limits, hardcode categories in UI (use shared enum), stop audio when opening a listing.

## Success Criteria

- `business.get` returns full listing in <500ms p95 with correct `open` for current time.
- Listing sheet shows name, products + prices, photos, phones, address, hours, open/closed, delivery flag.
- Delivery flag shown only when applicable: true means owner offers own transport or accepts a user-arranged courier coordinated via the listed contact; no in-app tracking, fees, zones, or dispatch in V1.
- Delivery flag display is conditional (rendered only when delivery is true, absent when false with no negative badge) via i18n dictionary: ES "Servicio a domicilio" / EN "Home delivery", no hardcoded UI copy.
- Open-status badge is always visible on card + sheet as exactly one of Abierto/Cerrado via i18n dictionary (ES "Abierto" / "Cerrado" + EN "Open" / "Closed"), server-derived from hours + now in the business timezone, same visibility tier as the delivery flag, no hardcoded UI copy.
- Opening a listing from web or native never pauses audio.
- No plan-tier badge is rendered in the public card or sheet; carousel priority is resolved server-side in ranking (see SPEC-memberships). The only plan badge is "Recomendado"/"Recommended" on the billing screen.
- Comunidad listings render direct contact details, one basic flyer, open/closed status, and map location with enforced limits (see SPEC-memberships).
- Oficios & Servicios listings can render specialties, coverage area, previous-work gallery, urgency badge, and base diagnostic rates.
- Comercios & Catálogo products allow at most three photos each under the current media cap; adding a fourth is rejected with PRODUCT_PHOTO_QUOTA_EXCEEDED, without asking an already-top-tier owner to upgrade.
- Sheet rows are tappable: phone dials, WhatsApp opens chat, address opens directions via system links.
- Phone values use E.164 (`+` followed by 2-15 digits, first digit 1-9); `tel:` links retain the `+`, while `wa.me` links omit it.
- One location per business in V1 (single address + hours + timezone); a second branch registers as another business on the same account.
- Category is a fixed giro enum shared between API and forms (display names via i18n dictionary, free text only for Otro); no free-text categories.
- Inventory and stock management are owner-side responsibilities and out of scope for Aquí Suena V1; the app displays reference prices and catalog data only.
- Stats count a carousel view after 2s visible and a detail visit on sheet open, with detail visits as the primary stat.

## Open Questions

- Image hosting: resolved — Cloudflare R2 (free tier: 10GB + 1M Class A ops/month + egress free). See SPEC-media-storage for upload flow and optimization.
