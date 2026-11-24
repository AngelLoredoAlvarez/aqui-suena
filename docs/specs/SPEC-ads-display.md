# Spec: ads-display — Aquí Suena (by 17Labs)

> **Status: partial (2026-11-16).** `ads.carousel` and the shared carousel component ship and serve ranked inventory with the designed empty state. The tappable card → listing sheet (`packages/ui/src/business-sheet.tsx`) is still TBD.

## Objective

"Listen and discover shops" in Aquí Suena: a sponsor carousel visible during listening that links to full listings without ever stopping audio. Comercios & Catálogo receives maximum priority, Oficios & Servicios receives elevated priority, and Comunidad uses standard community rotation. Users: listeners. Success = discovery without interrupting playback.

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
packages/api/src/server/routers/ads/carousel.ts  → ads.carousel (ranked by plan priority + recency, backed by getBusinessCarousel use-case)
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
- Locations: `packages/api/src/domain/ads/ranking.test.ts`, e2e `apps/web/e2e/ads.spec.ts`.
- Coverage: 100% on ranking + sheet-open audio continuity.
- Levels: unit (ranking) → integration (carousel query) → e2e (tap card → sheet with full info, audio uninterrupted).

## Boundaries

- Always: keep audio playing across carousel/scroll/sheet, respect plan priority, log impressions, run `typecheck + lint + test` before commit.
- Ask first: add autoplay video ads, add interstitials, change ranking weights.
- Never: pause/stop audio when opening a card, show ineligible (unpaid/expired) sponsors,use raw `div` scrollers bypassing Tamagui.

## Success Criteria

- Carousel visible on home during playback on web and native from shared code.
- Carousel navigation: previous/next buttons and horizontal drag move exactly one flyer in either direction, wrap around, and are hidden when only one flyer exists. Manual navigation restarts the auto-advance timer; the old pagination dots are gone.
- Tap card → sheet with name, products + prices, phone, address, open/closed, delivery flag; audio continues.
- Delivery flag in the sheet is informational only; tap resolves to a phone/WhatsApp + address contact handoff, never to dispatch or tracking in V1.
- Sheet delivery flag display is conditional (rendered only when delivery is true, absent when false with no negative badge) via i18n dictionary: ES "Servicio a domicilio" / EN "Home delivery", no hardcoded UI copy.
- Open-status badge is always visible on carousel card + sheet as exactly one of Abierto/Cerrado via i18n dictionary (ES "Abierto" / "Cerrado" + EN "Open" / "Closed"), server-derived from hours + now in the business timezone, same visibility tier as the delivery flag, no hardcoded UI copy.
- Sponsors rank deterministically by plan: Comercios & Catálogo first, then Oficios & Servicios, then Comunidad, with recency as tie-breaker; no cap on Comunidad entries and no per-session cap (full ranked rotation). Exact weights are defined in SPEC-memberships once approved.
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
  top-right + previous/next navigation buttons overlaid on the image.
- **Navigation buttons**: circular 44×44 buttons in `surface` with a
  `borderColor` border and a chevron icon, vertically centred on the image
  (`left/right: 12`). They carry `aria-label="Anuncio anterior"` /
  `"Anuncio siguiente"` (per locale) and are hidden when only one flyer is
  available. Horizontal drag over the card navigates one flyer in either
  direction (40 px threshold, horizontal component must exceed the vertical);
  a manual navigation restarts the auto-advance timer. The flyer container
  keeps `role="group"` and `aria-label="Anuncio N de M"` for the current slide.
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
  `flex:1` with badge + navigation arrows overlaid, then an info block (`padding:16`,
  `gap:6`): business **name** (`fs:22`, weight 700), **meta** line (`fs:14`,
  muted — e.g. `"Comida · Entrega a domicilio · Abre 8:00"`), and CTA
  **"Ver negocio"** (primary pill, `margin-top:8`); the label follows the business's primary public content, not only its account plan: use "Ver catálogo"/"View catalog" when the business has catalog products, "Ver servicios"/"View services" when it has offered services, and "Ver contacto"/"View contact" when it has neither. Comunidad businesses always use "Ver contacto".
- Header row (48px): search field (`role=search`, placeholder `"Buscar"`) +
  assistant icon + language `ES` + menu icon. Player dock sits below (dark
  theme) or above (light theme).

### Tablet (1024×768) — `TabletLanding`

- **Two-column directory**, not a centered card: left column (300px) has search
  - category chips + the "Negocios" list; the right detail panel
    (`border-radius:28`, overflow hidden) holds the **flyer image panel
  (330px wide)** with badge + navigation arrows overlaid, and an info column: name (`fs:24`),
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
fields: `{ id, imageUrl, alt, name, category, delivery, opensAt, isOpen, phone,
address, hours, href? }` — `name` renders the title; `category` is the business
category enum rendered through the i18n `category` labels ("Comida"/"Food",
"Servicios"/"Services", …), `delivery` is a boolean rendered via the i18n
`delivery` label ("Servicio a domicilio" / "Home delivery"), and `opensAt` is
the next opening time in `H:MM` format for a closed business, rendered via the
i18n `opensAt` formatter ("Abre 8:00" / "Opens 8:00"). The three compose the
meta line in one shared function (see below); `isOpen` drives the badge;
`phone`, `address` and `hours` feed the wide landing contact panel (phone,
WhatsApp, address and a compact weekly schedule); `href` links to the business
sheet (navigation still TBD). None of these user-facing strings are hardcoded.
These fields mirror what `businesses` exposes (category, delivery flag, hours,
contact data), so the carousel card, the landing directory panel, and the
future sheet reuse the same contract without refactoring later. The carousel
now serves real inventory from `ads.carousel` (getBusinessCarousel use-case);
there is no static seed. When no sponsors are eligible, the carousel renders
the empty state ("No sponsored businesses yet").

### i18n additions (es / en)

`open` ("Abierto"/"Open"), `closed` ("Cerrado"/"Closed"), `delivery`
("Servicio a domicilio"/"Home delivery"), `category(value)` (Comida/Food,
Salud/Health, Comercio/Retail, Servicios/Services, Cómputo/Computing,
Otros/Other, unknown values fall back to the raw value), `opensAt(time)`
("Abre 8:00"/"Opens 8:00"), `phone` ("Teléfono"/"Phone"), `whatsapp`
("WhatsApp"), `address` ("Dirección"/"Address"), `schedule`
("Horario"/"Hours"), `call` ("Llamar"/"Call"), `directions`
("Cómo llegar"/"Get directions"), `weekdays` (Dom–Sáb / Sun–Sat),
`viewBusiness` ("Ver negocio"/"View business") by plan: Comunidad
`viewContact` ("Ver contacto"/"View contact"),
Oficios `viewServices` ("Ver servicios"/"View services"), Comercios `viewCatalog`
("Ver catálogo"/"View catalog"), `noSponsoredBusinesses` ("No sponsored businesses yet"/"No
sponsored businesses yet"), `noSponsoredBusinessesHint` ("Check back soon: you will see businesses near you."/"Check back soon — you'll see businesses near
you here."), `adGroupLabel(index, count)` ("Ad N of M"/"Ad N of M").

`delivery` is canonical across all platforms: the mobile design's "Entrega a
domicilio" is a design inconsistency, superseded by "Servicio a domicilio".

### Scope boundary

The "card anatomy" unit owns the flyer card (image, badge, navigation arrows, name, meta
and CTA) rendered responsively across all three breakpoints. The landing shell
renders the tablet/web **read-only contact panel** (phone/WhatsApp/address/
schedule + inert Call/WhatsApp/Get directions actions) from the carousel item's
contact fields; see `SPEC-landing.md`. The full directory **list route and
detail sheet** remain in `SPEC-business-directory.md` and are implemented
there, not here.

## Decisions (resolved)

- Meta line is structured (`category` + `delivery` + `opensAt`), composed in
  one shared function — not a flat `meta` string (see Data model). Category
  labels and the opening-time prefix are i18n; `opensAt` is omitted while the
  business is open or when it has no weekly hours.
- Delivery label is canonical `"Servicio a domicilio"` / `"Home delivery"` on
  all platforms; the mobile design's "Entrega a domicilio" is a design
  inconsistency.
- No sponsorship/disclosure badge: the card stays clean as designed (only the
  open-status badge). Add a "Patrocinado"/"Sponsored" disclosure only if
  compliance or the business later requires it.
