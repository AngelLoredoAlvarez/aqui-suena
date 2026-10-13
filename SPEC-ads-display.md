# Spec: ads-display — Aquí Suena (by 17Labs)

## Objective
"Listen and discover shops" in Aquí Suena: a sponsor carousel visible during listening that links to full listings without ever stopping audio. Premium members get priority placement; free listings appear with normal weight. Users: listeners. Success = discovery without interrupting playback.

## Tech Stack
- Web: React + Next.js (App Router) + React Native Web
- Native: React Native + Expo (managed)
- Navigation: Solito (carousel card → `/business/[businessId]` sheet)
- UI: Tamagui (carousel, cards, bottom/top sheet that coexists with persistent player)
- Data: tRPC + TanStack Query (`ads.carousel` ranked by plan priority + recency)
- DB: Drizzle + PostgreSQL (reads `businesses` + `subscriptions`)
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
```

## Project Structure
```
packages/api/src/routers/ads.ts        → ads.carousel (ranked)
packages/ui/src/sponsor-carousel.tsx   → carousel (shared)
packages/ui/src/business-sheet.tsx     → listing sheet (shared, player-safe)
apps/web/app/page.tsx                  → home with carousel under/over player
apps/native/app/index.tsx              → same on native
```

## Code Style
Ranking is deterministic and testable:

```tsx
// packages/api/src/ranking.ts
export function rankSponsors(input: { priority: number; updatedAt: number }[]) {
  return input.sort((a, b) => b.priority - a.priority || b.updatedAt - a.updatedAt);
}
```

Conventions: sheet overlays content but never unmounts the player; carousel auto-advances every 5s and pauses on interaction; impressions logged for future billing proof.

## Testing Strategy
- Framework: Vitest + Testing Library + headed Playwright.
- Locations: `packages/api/src/ranking.test.ts`, e2e `apps/web/e2e/ads.spec.ts`.
- Coverage: 100% on ranking + sheet-open audio continuity.
- Levels: unit (ranking) → integration (carousel query) → e2e (tap card → sheet with full info, audio uninterrupted).

## Boundaries
- Always: keep audio playing across carousel/scroll/sheet, respect plan priority, log impressions, run `typecheck + lint + test` before commit.
- Ask first: add autoplay video ads, add interstitials, change ranking weights.
- Never: pause/stop audio when opening a card, show ineligible (unpaid/expired) sponsors,use raw `div` scrollers bypassing Tamagui.

## Success Criteria
- Carousel visible on home during playback on web and native from shared code.
- Tap card → sheet with name, products + prices, phone, address, open/closed, delivery flag; audio continues.
- Delivery flag in the sheet is informational only; tap resolves to a phone/WhatsApp + address contact handoff, never to dispatch or tracking in V1.
- Sheet delivery flag display is conditional (rendered only when delivery is true, absent when false with no negative badge) via i18n dictionary: ES "Servicio a domicilio" / EN "Home delivery", no hardcoded UI copy.
- Open-status badge is always visible on carousel card + sheet as exactly one of Abierto/Cerrado via i18n dictionary (ES "Abierto" / "Cerrado" + EN "Open" / "Closed"), server-derived from hours + now in the business timezone, same visibility tier as the delivery flag, no hardcoded UI copy.
- Premium sponsors rank above Free ones deterministically (Premium-first, then Free-by-recency); no cap on Free entries and no per-session cap (full ranked rotation).
- Player dock (top/bottom) never overlaps carousel controls (verified headed).
- On tablets the detail sheet uses two columns (info fixed left, products scrolling right) instead of stretching the phone layout.

## Open Questions
- Sponsored badge copy and disclosure rules?
