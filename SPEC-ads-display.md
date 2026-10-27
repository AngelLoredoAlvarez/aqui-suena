# Spec: ads-display — Aquí Suena (by 17Labs)

## Objective

"Listen and discover shops" in Aquí Suena: a sponsor carousel visible during listening that links to full listings without ever stopping audio. Premium members get priority placement; free listings appear with normal weight. Users: listeners. Success = discovery without interrupting playback.

## Tech Stack

- Web: React + Next.js (App Router) + React Native Web
- Native: React Native + Expo (managed)
- Navigation: TBD — carousel card → `/business/[businessId]` sheet. `packages/navigation` reserved; no Solito installed.
- UI: Tamagui (carousel, cards, bottom/top sheet that coexists with persistent player)
- Data: tRPC + TanStack Query (`ads.carousel` ranked by plan priority + recency)
- DB: Drizzle + SQLite/D1 (reads `businesses` + `subscriptions`)
- Media: Cloudflare R2 for flyer images (presigned PUT upload, content-addressed keys, optimized delivery — see SPEC-media-storage)
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
```

## Project Structure

```
packages/api/src/routers/ads.ts             → ads.carousel (ranked)
packages/ui/src/ads-carousel/ads-carousel.tsx → carousel (shared, card anatomy below)
packages/ui/src/business-sheet.tsx          → listing sheet (shared, player-safe; TBD)
apps/web/app/page.tsx                  → home with carousel under/over player
apps/mobile/app/index.tsx              → same on mobile
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

## Carousel visual anatomy (per platform)

Source of truth: the design export (`/home/angelo/Descargas/aqui-suena-designs/`,
sections 01 mobile / 09 tablet / 11 web, token sheet in `DESIGN_TOKENS.md`).
Every string below is quoted verbatim from the designs; do not reword UI copy.

### Global rules

- The ads carousel is **≈70 % of the height** and rotates one sponsored flyer
  per slide (example shows 4: `Anuncio 1 de 4`). Auto-advance 5s, pause on
  hover/focus/touch (already implemented).
- **Slide anatomy is identical across platforms**: full-bleed flyer image
  (`object-fit: cover`, `object-position: center top`) + an open-status badge
  top-right + pagination dots overlaid bottom-center on the image.
- **Dots**: active dot is a **24×8** pill in `accent`; inactive dots are
  **8×8** circles in `muted`; the group sits in a pill container
  (`border-radius: 999`, `background: surface`, gap 6, padding 7/10). The group
  carries `role="group"` and `aria-label="Ad N of M"` (per-slide index).
- **Card wrapper**: `border-radius: 28`, `border 1px --bd`, `overflow: hidden`,
  `background: surface`.
- **Badge**: `.bd` pill top-right (`right:12; top:12`), exactly one of
  `Abierto` (success `--ok`) / `Cerrado` (danger `--er`) via i18n, never
  hardcoded (see Success Criteria).
- Palette tokens map 1:1 to the theme: `accent`=`--pr`, `ok`=`--ok`,
  `error`=`--er`, `muted`=`--mu`, `surface`=`--sf`, `surface2`=`--sf2`,
  `borderColor`=`--bd`, `text`=`--tx`, `bg`=`--bg`.

### Mobile (390×844) — `Main` / `Owner`

- Vertical card fills the space between header and player dock; image area is
  `flex:1` with badge + dots overlaid, then an info block (`padding:16`,
  `gap:6`): business **name** (`fs:22`, weight 700), **meta** line (`fs:14`,
  muted — e.g. `"Comida · Entrega a domicilio · Abre 8:00"`), and CTA
  **"Ver negocio"** (primary pill, `margin-top:8`).
- Header row (48px): search field (`role=search`, placeholder `"Buscar"`) +
  assistant icon + language `ES` + menu icon. Player dock sits below (dark
  theme) or above (light theme).

### Tablet (1024×768) — `TabletLanding`

- **Two-column directory**, not a centered card: left column (300px) has search
  - category chips + the "Negocios" list; the right detail panel
    (`border-radius:28`, overflow hidden) holds the **flyer image panel
  (330px wide)** with badge + dots overlaid, and an info column: name (`fs:24`),
    meta (`fs:14`, e.g. `"Comida · Servicio a domicilio"`), contact rows
    (phone / WhatsApp / address / hours, each `min-height:52` with a
    bottom border) and actions **Call / WhatsApp / Get directions**
    (`margin-top:auto`).

### Web (1440×900) — `WebLanding`

- Same two-column directory as tablet, scaled up: header 64px, sidebar 380px,
  **flyer image panel 480px wide**, name `fs:26`, and the same contact rows +
  actions. Player dock is a full-width bar at the bottom with the extra
  control "Mover reproductor arriba o abajo".

### Empty state — `LandingVacio`

- Centered in the card: title **"No sponsored businesses yet"** (`fs:22`)
  and hint **"Check back soon: you will see businesses near you."** (`fs:14`,
  muted), both via i18n.

### Data model

`AdsCarouselItem` grows from `{ id, imageUrl, alt, href? }` to carry the card
fields: `{ id, imageUrl, alt, name, category, delivery, opensLabel, isOpen,
href? }` — `name` renders the title; `category` + `delivery` + `opensLabel`
compose the meta line in one shared function (see below); `isOpen` drives the
badge; `href` links to the business sheet (navigation still TBD). `delivery` is
a boolean rendered via the i18n `delivery` label ("Servicio a domicilio" /
"Home delivery"), never hardcoded. These fields mirror what `businesses`
exposes (category, delivery flag, hours), so the carousel card, the directory,
and the sheet reuse the same contract without refactoring later. The seed data
uses the design's example business "Desayunos Casa Rosa" so the card is
verifiable against the design.

### i18n additions (es / en)

`open` ("Abierto"/"Open"), `closed` ("Cerrado"/"Closed"), `delivery`
("Servicio a domicilio"/"Home delivery"), `viewBusiness` ("Ver negocio"/"View
business"), `noSponsoredBusinesses` ("No sponsored businesses yet"/"No
sponsored businesses yet"), `noSponsoredBusinessesHint` ("Check back soon: you will see businesses near you."/"Check back soon — you'll see businesses near
you here."), `adGroupLabel(index, count)` ("Ad N of M"/"Ad N of M").

`delivery` is canonical across all platforms: the mobile design's "Entrega a
domicilio" is a design inconsistency, superseded by "Servicio a domicilio".

### Scope boundary

The "card anatomy" unit owns the flyer card (image + badge + dots + name + meta
- CTA) rendered responsively across all three breakpoints. The directory
  **list** and the tablet/web **contact detail panel** (phone/WhatsApp/
  address/hours + Call/WhatsApp/Get directions) belong to
  `SPEC-business-directory.md` and are implemented there, not here.

## Decisions (resolved)

- Meta line is structured (`category` + `delivery` + `opensLabel`), composed in
  one shared function — not a flat `meta` string (see Data model).
- Delivery label is canonical `"Servicio a domicilio"` / `"Home delivery"` on
  all platforms; the mobile design's "Entrega a domicilio" is a design
  inconsistency.
- No sponsorship/disclosure badge: the card stays clean as designed (only the
  open-status badge). Add a "Patrocinado"/"Sponsored" disclosure only if
  compliance or the business later requires it.
