# Feature: flyer-lightbox-actions — floating zoom menu and flyer download

Objective: give the fullscreen flyer viewer a floating menu with zoom in / zoom
out / reset and a download action, on web, desktop and native.
Branch `feat/flyer-lightbox-actions`. Test runner: Vitest + Testing Library
(`packages/ui`).

## Specs

- S1. The viewer renders a floating pill at the bottom center with four 44x44
  buttons: zoom out, zoom in, reset zoom, download flyer. Every label comes from
  i18n (ES/EN).
- S2. Zoom buttons move the scale by 0.5 within 1x–3x; a button is disabled at
  its limit (zoom out and reset at 1x, zoom in at 3x). Gestures keep working.
- S3. Web/desktop download: fetch the flyer, save it as
  `flyer-<business-slug>.<ext>` through a temporary object URL. No backend change.
- S4. Native download (option B1): download the flyer into the cache with
  `expo-file-system` and open the system share sheet with `expo-sharing`; when
  sharing is unavailable, open the URL with `Linking`.
- S5. The download action never breaks the viewer: a failure leaves the viewer
  open and re-enables the button.
- S6. `docs/specs/SPEC-ads-display.md` and `README.md` document the menu and the
  download behavior.

## Tasks

- [x] T1. i18n keys and `plus` / `minus` / `reset` icons. Inline.
- [x] T2. `ZoomableImage` imperative handle and `onScaleChange` (web + native) + tests. Inline.
- [x] T3. `download-flyer` web with the slug helper + tests. Inline.
- [x] T4. `download-flyer` native (`expo-sharing` + `expo-file-system`) + tests. Inline.
- [x] T5. Floating menu in `FlyerLightbox` (web + native) + tests. Inline.
- [x] T6. Docs and full checks, headed web and emulator verification. Inline.

## Log

- L1. Goal: floating zoom controls and the flyer download agreed in the review
  of the viewer, keeping gestures and adding no backend work.
- L2. Native download uses option B1: no permissions, system share sheet.
  Dependencies added to `packages/ui`: `expo-sharing` and `expo-file-system`
  (SDK 58 compatible, versions from `expo/bundledNativeModules.json`).
- L3. The menu lives in the lightbox; it drives the zoom through an imperative
  handle exposed by `ZoomableImage` and disables buttons from `onScaleChange`.
- L4. T1/T2: i18n keys (`zoomIn`, `zoomOut`, `resetZoom`, `downloadFlyer`) and
  the `plus`/`minus`/`reset`/`download` icons; `ZoomableImage` exposes a
  `ZoomableImageHandle` (zoomIn/zoomOut/reset) and `onScaleChange`, shared with
  the native adapter. 21 zoom tests.
- L5. T3/T4: `download-name` slugifies the business name with its diacritics
  removed and keeps the URL extension; web uses fetch→blob→object URL, native
  uses `File.downloadFileAsync` + `Sharing.shareAsync` with a `Linking`
  fallback. 2 + 2 tests.
- L6. T5: `FlyerLightboxMenu` is shared by both lightboxes; zoom out/reset are
  disabled at 1x and zoom in at 3x, and the menu resets with the flyer. 19
  lightbox tests (web and native).
- L7. Headed web at 1440x900: the pill shows the four buttons, real clicks move
  the scale 1→1.5, and the download produced `flyer-el-sazon-de-ale.jpg`
  (431898 bytes) in ~/Descargas with the viewer still open.
- L8. Native (Pixel Tablet, Expo Go): the menu renders with the expected disabled
  states and zoom-in works; the download reached `File.downloadFileAsync` and
  failed only because the API answered 500 — `cloudflarestorage.com` was
  unreachable from the host at that moment (both IPv4 and IPv6), not a code
  fault. With a temporary local image URL the Android share sheet opened
  ("Sharing image"), proving the B1 flow; the temporary URL was reverted.
- L9. Retry with R2 reachable again: the first attempt failed with
  `ERR_DESTINATION_ALREADY_EXISTS` because the cache kept the earlier file; the
  module now deletes an existing destination before downloading (new test). The
  second attempt opened the Android share sheet with the real flyer preview.
- L10. Checks: `packages/ui` 246/246 (37 files), workspace typecheck 7/7,
  `biome check` clean, full `pnpm test` 7/7 tasks.
