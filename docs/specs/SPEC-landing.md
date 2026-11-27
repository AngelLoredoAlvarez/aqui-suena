# Spec: landing — Aquí Suena (by 17Labs)

> **Status: partial (2026-11-23).** The shared responsive shell ships: mobile
> header/search/assistant/language/menu + carousel + player dock; tablet/web
> header + sponsored directory (300/380 px) + carousel detail panel with contact
> rows/actions + dock; the web theme toggle works and persists. Navigation,
> search, assistant, business detail, and contact actions remain inert until
> their routes land. The web shell is verified at 390×844, 1024×768 and
> 1440×900; native renders the same shared component and is typechecked, not
> headed-verified.

## Objective

Give the listener landing the designed composition for mobile, tablet and web
from one shared `@aqui-suena/ui` implementation: listen to a station, discover
sponsored businesses, and switch stations without leaving the page. Success =
the same shell renders at the three breakpoints, the player keeps playing while
the directory/carousel is used, and no station screen is introduced.

## Tech Stack

- Shared UI: React + Tamagui + React Native Web, `packages/ui`.
- Data: `ads.carousel` (ranked sponsor inventory) and `listener.getStatus`.
- Playback: `packages/player` + the shared audio driver; the player dock is the
  only player surface.

## Layout

### Mobile (390×844) — `Main` / `Owner`

- Header: search pill, assistant icon button, language `ES`/`EN` pill, menu icon.
  The language pill opens a compact dropdown sized to its options (Español /
  English) with an active check.
- Content: one ads card (flyer, open badge, navigation arrows, name, localized meta, CTA),
  starting 12 px below the header.
- Player dock: circular play/pause, status/listener line, station selector,
  move-player control. The dock is below the card by default; the move control
  flips it above the card and persists the position. The dock uses the same
  width as the carousel card (12 px side margins), sits 12 px below the card and
  keeps a 16 px bottom inset. When flipped above the card it keeps the same
  12 px gap below the header and the card starts 12 px below the dock, so the
  carousel margins do not grow with the position.
- Light theme (`Owner`) reuses the same layout with the dock above the card;
  the manual theme toggle is a web header control for now.

### Tablet (1024×768) — `TabletLanding`

- Header: brand lockup (logo mark + "Aquí Suena"), assistant pill, language pill, menu icon.
- Left column (300 px): search, category/open/delivery chips, "Negocios" list of
  unique sponsored businesses (initials avatar, name, localized category +
  delivery, open/closed badge), legal links.
- Right panel: flyer panel (330 px) with badge + navigation arrows, business name, meta,
  contact rows (phone, WhatsApp, address, schedule), "Ver negocio" (`trades` and
  `commerce` plans only), and call/WhatsApp/directions actions.
- Player dock at the bottom.

### Web (1440×900) — `WebLanding`

- Header: brand lockup (logo mark + "Aquí Suena"), assistant pill, language pill, theme toggle, "Mis negocios".
- Left column (380 px) and right panel scaled up (480 px flyer), same content as
  tablet. The theme toggle switches Noche/Brasa and persists in localStorage.
  The player dock keeps a 12 px bottom margin. When moved above the
  carousel it keeps the same 12 px gap below the header, so its outer margins
  do not grow with the position; the content keeps its 20 px top gap when the
  dock is below.

## Data

- `AdsCarouselItem` carries `name`, `category`, `delivery`, `plan`, `opensAt`,
  `isOpen`, `phone`, `address`, `hours`, and the flyer image. Category and
  opening-time strings are localized in the UI; the wide "Ver negocio" CTA is
  rendered only for `trades` and `commerce` plans. See `SPEC-ads-display.md`.
- The directory list deduplicates the ranked carousel entries by business id.
- The wide contact panel formats weekly hours into a compact range
  (`Lun–Sáb 9:00 – 17:00`) with `formatSchedule`.
- The player keeps audio running while the carousel advances, filters change, or
  the station sheet opens.
- Moving the dock changes the layout order without remounting the player, so
  playback never restarts as a second audio element.

## i18n

Search, assistant, language, menu, theme, my businesses, businesses, filters,
legal links, contact labels, call/WhatsApp/directions, weekdays, and the existing
carousel labels ship in `es` and `en` with key parity.

## Interactions

- Working: language menu (the ES/EN pill opens a dropdown listing Español and
  English, with the active check), web theme toggle + persistence, directory
  filters, carousel auto-advance, arrows and drag, station selector, play/pause,
  move-player control.
- Inert until their routes land: search, assistant, my businesses, legal links,
  business cards, "Ver negocio", call/WhatsApp/directions.

## Non-goals

- No station screens: the player switches stations in place.
- No directory detail route or owner portal in this shell.
- No system-following theme yet; the manual web toggle is the current control.

## Testing

- Unit: header/sidebar/contact rendering, schedule formatting, theme
  persistence, existing player/carousel suites.
- E2E: 390×844 mobile shell, 1024×768 two-column shell, 1440×900 web shell,
  theme toggle + reload persistence, and the existing player/splash specs.
