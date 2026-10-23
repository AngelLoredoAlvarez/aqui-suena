# Feature: wide-desktop-composition

Branch: `feature/wide-desktop-composition` · Delivery: `ask-on-risk` · Runner: `pnpm --filter @aqui-suena/ui test` + `typecheck`, `pnpm --filter web test:e2e`

Compose the shared player surfaces for tablet and desktop. The design puts a
horizontal dock at the bottom of a wide canvas (tablet 1024×768, web 1440×900),
not a stretched mobile column. Tamagui default media (md 768, lg 1024, xl 1280,
xxl 1536) already matches the design breakpoints, so this is a component-level
change, not a config change.

Design evidence: `/home/angelo/Descargas/aqui-suena-spec/` — section 09
(tablet 1024×768), section 11 (web 1440×900), section 17 (tokens). Mobile
section 01 is the mobile baseline. Key layout rules from sections 09/11:
header is a full-width row (title left, locale right); the dock is a
full-width bar with 12px/24px margins: action left, status middle, station
selector right; the station selector is an `a-haspopup="listbox"` popover,
never a full-bleed sheet.

## Specs

S1 (Breakpoints). Tamagui default media breakpoints cover the design targets
(md 768, lg 1024, xl 1280, xxl 1536). No config change; documented in the
config header comment.

S2 (Landing composition). `player-landing.tsx`: below `md` the landing keeps
the 390px mobile column (title and locale stacked and centered, card pinned to
the bottom). From `md` up it uses the wide composition: 1440px canvas cap,
24px side padding, header row with the title left and the locale switcher
right, a flexible content area in the middle, and the dock in normal flow at
the end of the column.

S3 (Dock bar). `player-card.tsx`: the same horizontal dock bar is used at
every breakpoint, matching the mobile/tablet/web designs: playback action on
the left, `"<status> · <listeners>"` in the middle, station selector on the
right. Responsive spacing scales with the canvas; there is no separate mobile
card.

S4 (Station selector). `station-sheet.tsx`: below `md` it stays the
bottom sheet with the dimming backdrop and drag handle. From `md` up it is a
480px popover anchored to the right edge of the dock. It floats above the
dock (no layout space, so opening it never moves the page content), keeps a
transparent full-viewport click-catcher so outside clicks close it, and drops
the drag handle.

S5 (Verification). Unit tests for the pure width helpers, existing UI suites
green, `typecheck` clean, Playwright e2e at 1440×900 proving the dock spans the
canvas and the selector stays ≤480px, plus Chrome DevTools measurements at
390/768/1024/1440.

## Tasks

- [x] T1 — Confirm breakpoints (S1). Documented; no config change.
- [x] T2 — Responsive helpers (S2/S3): `getResponsiveMaxW` (390 | 1440) and
      `getResponsiveCardMaxW` (480 | undefined) with unit tests.
- [x] T3 — Wide landing composition (S2): header row, flexible content, dock in
      flow, 1440 canvas cap. `player-landing.tsx`.
- [x] T4 — Dock bar (S3): one horizontal dock for mobile/tablet/web,
      matching the mobile design. `player-card.tsx` no longer keeps a separate
      vertical mobile card.
- [x] T5 — Station selector popover (S4): 480px right-aligned, absolutely
      positioned above the dock (no reflow), transparent click-catcher, no drag
      handle on wide.
- [x] T6 — Verification (S5): 101 unit tests, typecheck clean, 14 Playwright
      e2e green, measured dock 1392px at 1440, popover 480×220 at the right
      edge, mobile 390 unchanged.

## Log

L1 (2026-10-23, user): "vamos por el 1" — start wide desktop composition (1440).

L2 (2026-10-23, first implementation): applied `maxW` breakpoints only
(390/768/1024/1280 landing, 480/640/720 card, 390/768/1024 carousel). This
stretched the mobile column and blew up the station sheet to the landing
width; it did not compose the wide layout.

L3 (2026-10-23, user): "no puñetas, asi se ve lo que hicimos: [screenshot]
eso se parece a los diseños o que vergas?" — the stretched column does not
match sections 09/11.

L4 (2026-10-23, user): "arregla tu desmadre" — authorize the fix.

Correction rationale: responsive is a composition change, not a width change.
The design's wide layout is a dock bar plus a popover selector; the two-column
business directory (380px list + 480px flyer/detail) belongs to the
`business-directory` feature and is not invented here.

L5 (2026-10-23, user): "el hacer click fuera del sheet en web se rompio, y
cuando el sheet se muestra el adds se ve que se mueve hacia arriba, el sheet
debe de apareces por encima de todo" — fixed: the popover is now absolutely
positioned above the dock (it no longer consumes layout space) and the wide
backdrop is a transparent click-catcher instead of being removed.

L6 (2026-10-23, user): "cuando el sheet esta abierto, se genera un margen a los
lados que no permite hacer clic afuera del sheet para cerrarlo en web" — fixed:
the absolutely positioned popover container was interactive across its full
width, intercepting outside clicks before the backdrop could receive them. The
container is now pointer-transparent and only the card handles presses.

L7 (2026-10-23, user): "debe de ser la misma vista, el mismo card player para
ambos, revisa los diseños" — fixed: the mobile design also uses the same
horizontal bottom dock, so `PlayerCard` now renders one horizontal dock at
every breakpoint instead of a separate vertical mobile card. The responsive
card width helper and its tests were removed.

L8 (2026-10-23, user): "no, tenemos qe hacerlo ahora" — fixed: the dock's
playback action now matches the design's 64px circular `.pb` button with a
24px icon (pause/play/loading), implemented cross-platform with Tamagui
primitives instead of raw SVG or a native dependency. The button now uses
primary/onPrimary colors.

Verification evidence: dock 1392×74 at x=24 on 1440×900 (canvas minus 24px
margins), popover 480×220 ending at x=1436 sitting above the dock with the
ads box unchanged at y=386, outside click closes it, dock 720 wide at 768,
mobile 390 uses the same horizontal dock; no horizontal scroll at any width.

Locator: odd/tasks/wide-desktop-composition.md
