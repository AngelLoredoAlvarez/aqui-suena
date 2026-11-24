# Feature: landing-v2-shell — Responsive landing shell

## Objective

Replace the old centered landing with the design export's responsive shell for
mobile, tablet and web from shared `@aqui-suena/ui` code: header, sponsored
directory, ads carousel/detail panel, player dock, and a persisted web theme
toggle. Navigation and contact actions stay inert until their routes land.

Branch: `feat/landing-v2-shell`
Delivery strategy: `ask-on-risk` (default)
Test runner: `vitest` via `pnpm --filter @aqui-suena/ui test` and
`pnpm --filter @aqui-suena/api test`; Playwright e2e.

## Specs

- S1. Mobile header: search, assistant, language pill, menu. Tablet header:
  brand, assistant, language, menu. Web header: brand, assistant, language,
  theme toggle, my businesses.
- S2. Mobile layout: one ads card + player dock, using the design's paddings;
  the move control flips the dock above/below the card.
- S3. Tablet/web layout: sidebar with search, category/open/delivery chips,
  unique sponsored-business list with open badges, and legal links; widths
  300/380 px.
- S4. Wide detail panel: flyer, name, localized meta, phone/WhatsApp/address/
  schedule rows, "Ver negocio", and call/WhatsApp/directions actions.
- S5. Player dock: reuse the shared player logic and dock; generic theme tokens;
  status fallback for blocked/idle; responsive margins.
- S6. Theme: web toggle switches Noche/Brasa and persists in localStorage; the
  landing accepts an initial scheme.
- S7. i18n: search, assistant, language, menu, theme, my businesses, businesses,
  filters, legal, contact labels, weekdays, in `es` + `en` with parity.
- S8. Inert links: search, assistant, my businesses, legal, business cards,
  "Ver negocio", call/WhatsApp/directions.
- S9. Icons: shared `Icon` with web `<svg>` and native `react-native-svg`
  implementations, using the design paths.
- S10. Tests cover schedule formatting, theme persistence, the shell layouts and
  the existing player/carousel behavior; docs updated.

## Tasks

- [x] T1 Shared icon component with web/native split
- [x] T2 Responsive header
- [x] T3 Sidebar list, filters and legal links
- [x] T4 Wide contact panel and actions
- [x] T5 Mobile and wide responsive shell
- [x] T6 Dock/token/status polish and responsive margins
- [x] T7 Web theme toggle + persistence
- [x] T8 i18n additions and tests
- [x] T9 Playwright verification at 390/1024/1440 and existing e2e suite
- [x] T10 Docs (`SPEC-landing`, README, ads/directory specs)

## Log

- L1. Objective: implement the designed landing shell for all breakpoints,
  reusing the existing player, station sheet and ads carousel.
- L2. Route: inline, one cohesive feature; no parallel disjoint writer units.
- L3. The carousel contract gained `phone`, `address` and `hours` so the wide
  detail panel renders real contact data. The fields are optional on the client,
  so old/new API/UI combinations degrade to no panel.
- L4. Header/sidebar are new shared components; the previous `PlayerLanding`
  layout was replaced while keeping the player/station/ads behavior.
- L5. Mobile: header + card + dock. Tablet/web: header + 300/380 px sidebar +
  carousel detail panel + dock.
- L6. Dock uses generic theme tokens and shows idle/blocked fallback copy.
- L7. Theme toggle is web-only for now and persists in localStorage; mobile and
  tablet keep the design's menu (inert) for the future theme control.
- L8. Icons are platform-split: `icon.tsx` renders inline SVG for web,
  `icon.native.tsx` uses `react-native-svg` for native. The web build no longer
  pulls native SVG internals.
- L9. Verification (2026-11-23): API 1334 tests, UI 157 tests, full workspace
  typecheck, web build, and Playwright 18/18 (player + splash) plus a temporary
  shell spec at 390×844, 1024×768 and 1440×900. Screenshots reviewed for all
  three breakpoints; tablet/web contact panel, filter list and theme toggle
  verified. The local seeded database supplied 13 businesses.
- L10. Pending: search/assistant/my-businesses/legal routes, business detail,
  contact action URLs, system-following themes, native headed verification, and
  list/carousel selection sync. The work ships in the commits on this branch;
  the PR is recorded in L14.
- L11. Position-toggle regression fixed (2026-11-23): the shell rendered the
  `StationPlayer` in two conditional slots, so moving the dock unmounted the
  player and a second audio element started. The player is now rendered once
  and the wrapper flips between `column` and `column-reverse`; the player stays
  mounted and playback continues. A unit test asserts one dock and no new play
  call on toggle; the new "moving the player does not restart playback" e2e
  passes in ES and EN. Full e2e: 20/20.
- L12. Shell polish (2026-11-23): the ES/EN pill now opens a dropdown with
  Español/English and an active check instead of toggling on click; the mobile
  dock matches the carousel width (12 px side margins), has a 12 px gap below
  the card and a 16 px bottom inset; the web/tablet dock has a 12 px bottom
  margin. Verified with Playwright metrics and the locale menu; full e2e 20/20.
- L13. Spacing polish (2026-11-23): the language dropdown lost its 180 px
  minimum width and now sizes to the options (~96 px); the mobile card starts
  12 px below the header. A mobile Playwright measurement confirmed
  `topGap: 12` and option width ~96.5 px; full e2e 20/20.
- L14. PR: recorded after the branch is pushed.
