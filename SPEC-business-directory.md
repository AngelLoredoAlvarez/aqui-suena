# Spec: business-directory — Aquí Suena (by 17Labs)

## Objective
Single source of truth for Aquí Suena small-business listings (restaurants, clothing shops, etc.): name, category (food, computing, etc.), products with prices, product photos (when applicable), phone numbers, emails (when applicable), address, working hours, open/closed state, and home-delivery flag (when applicable). Users: owners edit via owner-portal; listeners read via ads-display sheets. Success = every paid listing renders complete, correct info without stopping audio.

## Tech Stack
- Web: React + Next.js (App Router) + React Native Web
- Native: React Native + Expo (managed)
- Navigation: Solito (routes `/business/[businessId]`)
- UI: Tamagui (universal cards, sheets, image lists)
- Data: tRPC + TanStack Query (list/get with cache), zod validation
- DB: Drizzle + PostgreSQL (`businesses`, `products`, `photos`, `hours`)
- Language: TypeScript strict
- Lint/format: Biome (replaces ESLint + Prettier)

## Commands
```
Dev web: pnpm --filter web dev
Dev native: pnpm --filter native start
Build: pnpm -r build
Test: pnpm -r test -- --run
Lint: pnpm exec biome check --write .
Typecheck: pnpm -r typecheck
DB push (dev): pnpm --filter db db:push
```

## Project Structure
```
apps/web/app/business/[businessId]/page.tsx → listing route (web)
apps/native/app/business/[businessId].tsx    → listing route (native)
packages/db/src/schema.ts                   → businesses, products, photos, hours
packages/api/src/routers/business.ts         → business.list / business.get
packages/ui/src/business-card.tsx            → shared card + sheet
```

## Code Style
Functional components, Tamagui primitives + tokens, `kebab-case` files, `PascalCase` components:

```tsx
// packages/ui/src/business-card.tsx
import { Card, Image, Text, YStack } from 'tamagui';
import { Link } from 'solito/link';

export function BusinessCard({ id, name, category, open }: { id: string; name: string; category: string; open: boolean }) {
  return (
    <Link href={`/business/${id}`}>
      <Card>
        <YStack padding="$3">
          <Text>{name}</Text>
          <Text>{category} · {open ? 'Open' : 'Closed'}</Text>
        </YStack>
      </Card>
    </Link>
  );
}
```

Conventions: zod schemas shared between API and forms; hours stored as weekly ranges; `open` derived server-side from hours + now in the business timezone (stored IANA zone, never device time); no client-only open logic.

## Testing Strategy
- Framework: Vitest + Testing Library; Playwright headed for sheet flows.
- Locations: `packages/api/src/routers/*.test.ts`, `packages/ui/src/*.test.tsx`, e2e `apps/web/e2e/business.spec.ts`.
- Coverage: 100% on open/closed derivation and price formatting.
- Levels: unit (hours→open, phone/address formatting) → integration (tRPC list/get) → e2e (open listing from carousel, audio keeps playing).

## Boundaries
- Always: validate listing inputs with zod, derive `open` from hours, show delivery only when applicable, run `typecheck + lint + test` before commit.
- Ask first: add a listing field, change hours model, add image hosting provider.
- Never: expose owner emails/phones to scrapers without rate limits, hardcode categories in UI (use shared enum), stop audio when opening a listing.

## Success Criteria
- `business.get` returns full listing in <500ms p95 with correct `open` for current time.
- Listing sheet shows name, products + prices, photos, phones, address, hours, open/closed, delivery flag.
- Delivery flag shown only when applicable: true means owner offers own transport or accepts a user-arranged courier coordinated via the listed contact; no in-app tracking, fees, zones, or dispatch in V1.
- Delivery flag display is conditional (rendered only when delivery is true, absent when false with no negative badge) via i18n dictionary: ES "Servicio a domicilio" / EN "Home delivery", no hardcoded UI copy.
- Open-status badge is always visible on card + sheet as exactly one of Abierto/Cerrado via i18n dictionary (ES "Abierto" / "Cerrado" + EN "Open" / "Closed"), server-derived from hours + now in the business timezone, same visibility tier as the delivery flag, no hardcoded UI copy.
- Opening a listing from web or native never pauses audio.
- Free listings render with enforced limits (see SPEC-memberships).
- Sheet rows are tappable: phone dials, WhatsApp opens chat, address opens directions via system links.
- One location per business in V1 (single address + hours + timezone); a second branch registers as another business on the same account.
- Category is a fixed giro enum shared between API and forms (display names via i18n dictionary, free text only for Otro); no free-text categories.
- Stats count a carousel view after 2s visible and a detail visit on sheet open, with detail visits as the primary stat.

## Open Questions
- Image hosting provider for product photos (2MB max per photo in JPG/PNG/WebP with client-side compression decided)?
