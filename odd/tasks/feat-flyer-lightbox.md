# Feature: flyer-lightbox — fullscreen flyer viewer with zoom

Objective: let a listener open the landing flyer fullscreen and zoom it on web,
desktop (the same web build) and native without interrupting playback.
Branch `feat/flyer-lightbox`. Test runner: Vitest + Testing Library
(`packages/ui`).

## Specs

- S1. Tapping the flyer image in the landing carousel opens a fullscreen viewer
  that shows the whole flyer (`object-fit: contain`) on web, desktop and native.
- S2. Web/desktop viewer: fixed overlay above the app with `role="dialog"` and
  `aria-modal="true"`, labelled from i18n. It closes on backdrop press, Escape
  and a 44x44 close button whose `aria-label` comes from i18n.
- S3. Native viewer: transparent `Modal` with `onRequestClose`, same close
  button and the same content.
- S4. Zoom range 1x–3x. Web: ctrl/meta + wheel, double click, keyboard
  `+`/`-`/`0`, and drag to pan while zoomed. Native: pinch and drag to pan.
  The zoom resets when the viewer closes or the flyer changes. Panning is
  clamped to the viewport so no edge is lost.
- S5. While the viewer is open the carousel does not auto-advance. A drag that
  navigates the carousel must not open the viewer. Navigation arrows keep
  working while the viewer is closed.
- S6. No hardcoded copy: every new string lives in `packages/ui/src/i18n/locales.ts`
  for ES and EN.
- S7. `docs/specs/SPEC-ads-display.md` and `README.md` describe the viewer and
  its gesture contract.

## Tasks

- [x] T1. Zoom math helpers + tests (`zoomable-image/zoom.ts`). Inline.
- [x] T2. `ZoomableImage` web adapter + tests (wheel, double click, keys, pan, tap). Inline.
- [x] T3. `ZoomableImage` native adapter (PanResponder + Animated) + gesture test. Inline.
- [x] T4. `FlyerLightbox` web + tests (dialog, Escape, close, tap, zoom reset). Inline.
- [x] T5. `FlyerLightbox` native (Modal) + test with a mocked `react-native`. Inline.
- [x] T6. Carousel wiring: press layer, swiped flag, pause, item snapshot + tests. Inline.
- [x] T7. i18n keys and the close icon. Inline.
- [x] T8. Docs (`SPEC-ads-display`, README) and full checks. Inline.

## Log

- L1. Goal: fullscreen flyer viewer with zoom on every platform, keeping the
  audio playing and the landing layout unchanged while closed.
- L2. Chosen zoom affordance: gestures only (no visible +/-/reset controls),
  the recommended option from the design pass, so no new visible elements
  beyond the close button already part of the approved viewer.
- L3. `react-native` is declared in `packages/ui` (catalog 0.88.1) because the
  native adapter imports `PanResponder`, `Animated` and `Modal`; the web build
  keeps aliasing it to `react-native-web` and never loads `.native` files.
- L4. The viewer mounts as a sibling of the flyer panel inside `AdsCarousel`:
  web uses `position: fixed` (no transformed ancestor), native uses `Modal`, so
  the card's `overflow: hidden` cannot clip it.
- L5. T7: new keys `openFlyer` / `closeFlyer` / `fullscreenFlyer` (ES+EN) and an
  `x` icon shape.
- L6. T1: `clampScale`, `clampOffset`, `distance`, `pinchScale`, `toggleScale`;
  6 tests. `-0` normalization needed in the offset clamp.
- L7. T2: web adapter attaches DOM listeners (wheel with ctrl/meta, dblclick,
  click with a 220 ms double-click window and a 6 px drag threshold, keys
  `+`/`-`/`0`, pointer pan). `data-scale` / `data-offset` expose state to tests.
  10 tests.
- L8. T3: native adapter keeps scale/offset in `Animated.Value`s and uses
  `PanResponder`; pinch when two touches, pan when one and zoomed, spring back
  to the clamped offset. 3 tests with a mocked `react-native`.
- L9. T4/T5: web dialog has `role="dialog"`, `aria-modal`, Escape, tap and a
  44x44 close button; native is a transparent `Modal` with `onRequestClose` and
  the safe-area top. 6 + 3 tests.
- L10. T6: the carousel renders a transparent press layer over the flyer
  (`z=1`, arrows/badge `z=2`), records a `swiped` flag in `handlePointerMove`
  and ignores presses after a swipe; the open snapshot pauses auto-advance.
  3 new carousel tests.
- L11. Verification 2026-11-25: `packages/ui` 233/233 tests (34 files),
  workspace `pnpm typecheck` 7/7, `check-singletons` ok with `react-native`
  declared in `packages/ui`, headed check at 1440×900: the press layer opens the
  dialog, the whole flyer renders with `contain`, double click and ctrl+wheel
  reach 2x/2.2x (computed matrix), Escape and a tap close it, and the landing is
  intact underneath.
- L12. Not committed yet: waiting for the user's go.
- L13. Native bug report: the modal opened with no image and no close icon.
  Causes: (a) the native `Icon` kept its own `IconName` union without `x`, so
  `shapes.x` was undefined and the SVG rendered empty; (b) the native
  `ZoomableImage` container only declared `flex: 1` inside a centered `YStack`,
  so Yoga collapsed its cross-axis width to 0 (the web file declared `width:
  100%`); the lightbox container also lacked explicit width/height.
- L14. Fixes: `shared/icon-names.ts` becomes the single source for `IconName` /
  `IconTone` (both icon files must implement every name, checked by
  `Record<IconName, ...>`); native icon adds the `x` path; native
  `ZoomableImage` uses `width: "100%"` and the content `alignSelf: "stretch"`;
  the lightbox container is `width/height: "100%"`. The native zoom test now
  asserts the container width.
- L15. Native verification 2026-11-25 on the Pixel Tablet emulator through Expo
  Go (the installed dev build on the other emulator predates expo-image and
  crashes): `uiautomator` reports the flyer image with full-screen bounds
  [0,0][2560,1600] and the close button at [2448,96][2536,184] labelled "Close
  flyer"; the screenshot shows the whole flyer and the X icon, and tapping the
  button dismisses the modal. `packages/ui` 233/233, typecheck clean.
