# Spec: owner-portal — Aquí Suena for Business (by 17Labs)

## Objective
Aquí Suena for Business (by 17Labs): web-first portal where business owners create and maintain everything listeners see in Aquí Suena: products + prices, product photos (when applicable), working hours, phones, emails (when applicable), home-delivery flag (when applicable), and category. Gated by memberships. Users: verified owners. Success = an owner can go from signup to live listing without support.

## Tech Stack
- Web: React + Next.js (App Router) (portal is web-first; native read-only)
- Native: n/a for editing (owners use web)
- Navigation: Solito (`/owner`, `/owner/listings`, `/owner/billing`)
- UI: Tamagui (forms, uploads, schedules)
- Data: tRPC + TanStack Query + React Hook Form + zod resolvers
- DB: Drizzle + PostgreSQL (same `businesses` tables as directory)
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
apps/web/app/owner/page.tsx              → dashboard
apps/web/app/owner/listings/page.tsx     → CRUD listings
apps/web/app/owner/media/page.tsx        → photo uploads
packages/api/src/routers/owner.ts        → owner.createListing / updateListing / uploadPhoto
packages/ui/src/listing-form.tsx         → shared form (zod-driven)
```

## Code Style
One schema drives form + API:

```tsx
// packages/api/src/schemas/listing.ts
import { z } from 'zod';
export const ListingSchema = z.object({
  name: z.string().min(2),
  category: z.enum(['food', 'clothing', 'computing']),
  phones: z.array(z.string()).min(1),
  address: z.string().min(5),
  hours: z.array(z.object({ day: z.number(), open: z.string(), close: z.string() })),
  delivery: z.boolean().default(false),
});
export type ListingInput = z.infer<typeof ListingSchema>;
```

Conventions: image upload via signed URLs; preview before publish; every mutation revalidates entitlements.

## Testing Strategy
- Framework: Vitest + Testing Library + headed Playwright for the owner happy path.
- Locations: `packages/ui/src/listing-form.test.tsx`, e2e `apps/web/e2e/owner.spec.ts`.
- Coverage: 100% on ListingSchema and entitlement rejections.
- Levels: unit (schema) → integration (create→publish→visible in directory) → e2e (owner publishes photo + hours, listener sees it).

## Boundaries
- Always: require auth + business ownership checks, validate with zod, compress photos client-side, run `typecheck + lint + test` before commit.
- Ask first: add a listing field, allow multiple branches per owner, enable native editing.
- Never: let one owner edit another listing, publish without entitlement check, store raw uploads without virus/size guards.

## Success Criteria
- Owner completes signup → listing → publish in <10 minutes unaided (headed e2e).
- Photos render on listener sheet in <2s on 4G.
- Hours saved here drive correct open/closed in directory immediately.
- Free-plan caps show inline upgrade hints, never silent failures.

## Open Questions
- Owner verification (email vs phone vs manual)?
- Photo limits (count, MB, formats) per plan?
- Multi-branch support in V1 or single location only?
