# SPEC: Splash Screens

## Status

Implemented on 2026-11-23 for the design animations and a temporary 2 s duration. The readiness-driven timing described below is not wired yet: desktop and native still use a fixed 2 s timer. The light-theme variants and the PWA manifest remain pending.

## Goal

A single branded boot experience across desktop (Tauri), native (Expo) and the installed PWA, without gating the browser landing. The splash covers boot, never a network waterfall: the app shell and its data requests start in parallel; the splash hides when the first useful frame is ready, within a floor and a ceiling.

## Platforms

### Desktop (Tauri)

- The overlay ships in the static export and is visible from the first paint. An inline head script adds `tauri` to `<html>` before React hydrates; the browser and the PWA never see it.
- The app mounts behind the overlay; the listener and ads queries start at mount.
- Current duration: 2 s fixed (1.8 s visible plus a 200 ms fade).
- Files: `apps/web/app/boot-splash.tsx`, `apps/web/public/boot-splash.css`, `apps/web/app/layout.tsx`.

### Native (Expo)

- `expo-splash-screen` keeps the system splash visible until Plus Jakarta Sans loads; `SplashScreen.hide()` then hands off to the in-app `MSplash`/`TSplash` boot screen.
- The system splash uses the transparent `splash-logo-dark.png` on `#0F1720` with `imageWidth: 140`. Android 12+ uses the app icon for its system splash; the full composition lives in the in-app screen.
- The in-app boot screen is an overlay above `PlayerLanding`; the player and its queries start behind it.
- Current duration: 2 s fixed.
- Files: `apps/mobile/app.json`, `apps/mobile/app/_layout.tsx`, `apps/mobile/app/index.tsx`, `apps/mobile/components/native-boot-splash.tsx`.

### Browser and PWA

- No in-page gate. The landing renders immediately.
- A web app manifest is pending for the OS-generated splash on an installed PWA.

## Animation spec

The source is `docs/designs/tokens.md` (local design reference; not committed). The animations apply to `MSplash`/`TSplash`/`WSplash` and their light variants.

- Logo arcs: `.arc`, `2 s ease-in-out infinite`, opacity `.25` to `1`; `.a2` adds a `.35 s` delay.
- Shop bars: `.bar`, `1.2 s ease-in-out infinite`, `scaleY` `.55` to `1`; `.b2`/`.b3` add `.2 s`/`.4 s` delays.
- Progress fill: `.fill`, `2.4 s ease-in-out infinite`, width `5%` to `100%`; the base width is `40%`. It is indeterminate, not real progress.
- 17Labs terminal: `.code` reuses the `arc` pulse.
- C111 bits: `.bit`, `1.6 s ease-in infinite`, opacity `0` to `1` to `0` and `translateY` `-6` to `8`; children 2–7 add `.2 s` to `1.2 s` delays.
- Cursor: `.cur`, `blink 1 s steps(1) infinite`.
- Splash theme: dark `--sf2 #2C3E52`, `--tl #14B8A6`, `--tt #5EEAD4`; light `--sf2 #DDD5C9`, `--tl`/`--tt #0B7A63`.
- Reduced motion: all six animations off; the fill stays at `40%`; the rest renders in its static frame.

## Timing policy

The splash is a cover, not a loading gate. It must never wait for every Cloudflare request.

- Minimum: `700 ms` (brand floor). The design loops are indeterminate, so an early hide cuts them; that is acceptable.
- Maximum: `2 s` (failsafe). After 2 s, hide regardless and let the app's own states render.
- Hide condition: `criticalReady && minElapsed`, or `maxElapsed`.
- Critical readiness: fonts, session/account resolution and the selected station/stream — the data needed for the first useful frame.
- Non-critical: ads inventory, directory, plans and media. They never gate the splash; they render skeletons or the designed empty/error states (`LandingCargando`, `LandingVacio`, `LandingError`).
- Requests start in parallel with the splash; no waterfall and no `Promise.all` over unrelated queries.
- Network error or offline: hide the splash and hand off to the app's state; never leave a permanent splash.
- Instrument critical readiness at p50/p95 and enforce a budget; an unavailable or unknown measurement is not readiness.

The 2 s currently in code is the ceiling used as a placeholder, not the target. When the fetch/readiness logic lands, a fast boot must hide at 700 ms. The readiness source replaces the timer, never the floor or the ceiling.

## Out of scope and pending

- `MSplashL`/`TSplashL` depend on the app theme switch.
- The PWA manifest for the OS-generated splash.
- Readiness wiring for the critical fetches.
- The text design export does not include the exact peak frame for `bar`/`bit`; the implementation uses `50%` for `bar` and `40%` for `bit`.

## Verification

- Desktop: `apps/web/e2e/splash.spec.ts` (browser skips, Tauri-like marker shows and hides); `STATIC_EXPORT=1 pnpm --filter web build`.
- Native: Gradle debug build with `react-native-svg`; Pixel 7 AVD (Android 16); recorded frames show the arcs, bars, fill and 17Labs animations.
- Repository: `pnpm exec biome check .`, `pnpm -r typecheck`, `pnpm arch`, `pnpm check:singletons`, `pnpm test`, `pnpm install --frozen-lockfile --lockfile-only`.
