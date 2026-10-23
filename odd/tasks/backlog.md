# Backlog — aqui-suena

Cross-feature TODO list. Items land here when they are out of scope for the
active feature but must not be lost. Checked items move to Engram, not deleted.

Last synced 2026-10-23 against `main` (T4 parity + docs close merged; async-storage blocked on Expo Go moved out of active items).

## Known limitations (platform)

- Android media notification (cosmetic, dev assets only): the system notification
  may show an inert "previous" button and a progress bar for finite dev assets
  (test-pop.m4a, etc.). Root cause: expo-audio's `AudioLockScreenOptions`
  (`showPreviousTrack`, `showNextTrack`, `isLiveStream`) are already set to
  hide these, but Android's `MediaStyle` notification can still render default
  transport controls and a progress bar for media items with a known duration.
  On production live streams (`isLiveStream: true` with no finite duration),
  the progress bar is hidden. The previous button is a known expo-audio/Android
  limitation not controllable via the public API. No action taken — documented
  as expected dev-only cosmetic. See `packages/ui/src/drivers/expo-driver.native.ts`
  (`LOCK_SCREEN_OPTIONS`).

## Restyle follow-ups (from player-restyle-01)

- [x] Wide desktop composition (1440): DONE 2026-10-23. From `md` up the landing uses the 1440px canvas with a header row and the player as a full-width bottom dock bar; the station selector is a 480px popover at the dock's right edge. The same horizontal dock is used on mobile, tablet and web. Verified with unit tests, Playwright e2e at 1440×900, and Chrome DevTools at 390/768/1024/1440. Feature: odd/tasks/wide-desktop-composition.md. The two-column business directory (380px list + 480px flyer/detail) remains `business-directory` scope.
- [ ] Empty + ad-countdown states → ads-display / owner modules.
      `AdsCarousel` is still a static placeholder, so no trigger exists yet.
- [ ] System-following themes (`useColorScheme` → noche/brasa) + brasa headed
      verification. The noche/brasa token sets exist; no `useColorScheme` call
      does.
- [ ] Tamagui `ZStack` cleanup for the overlay: overlays are still positioned
      with `position="absolute"` on `YStack` (`player-landing.tsx`), the
      non-idiomatic shape found during the overlay work.

## Platforms

- [ ] Windows/macOS signing and publishing. The desktop stays dev-only until
      then. Packaging stopped being the gap: `pnpm build` produces deb, rpm
      and AppImage from `apps/web` (verified 2026-10-21). The rpm needs an
      ASCII `productName` because Tauri writes the package in Rust and rejects
      accented names. Feature history: `odd/tasks/desktop-build.md`; tray
      runtime requirements: Engram topic `desktop/tray-runtime-requirements`.

## Verification gaps

- [x] Metro vs react-native question — RESOLVED benign 2026-10-22: the peer
      warning comes from `@react-native/community-cli-plugin@0.88.0`
      (transitive via `react-native@0.88.0`) declaring a peer on
      `@react-native/metro-config@0.88.0`, while `@expo/metro@58.0.0` pins
      `metro@0.87.1`. Expo uses its own CLI (`@expo/cli`), not the community
      CLI, so the plugin is dead code and the mismatch is harmless. Forcing
      `@react-native/metro-config@0.88.0` would break Expo's bundler. Leave
      as-is.

## Dependencies (scheduled slices, not bedtime)

- [x] TypeScript migration — DONE 2026-10-22: 5.9.3 → 7.0.2 (the native Go
      compiler). Deliberately ahead of `expo install --check` (SDK 58 expects
      `~6.0.3`); `tsconfig.base.json` dropped `baseUrl`, so it is TS7-ready.
      Feature: `odd/tasks/deps-typescript.md`.
- Patch/minor bumps applied 2026-10-22 (`chore/deps-typescript`):
      `@tanstack/react-query` 5.104.5, `@tauri-apps/api`/`@tauri-apps/cli`
      2.12.4, `turbo` 2.11.10, `dependency-cruiser` 18.7.0, `tamagui` +
      `@tamagui/config` 3.1.2. `react`/`react-dom` were bumped to 19.3.1 then
      REVERTED to 19.3.0 to match Expo SDK 58. `@types/node` stays at 24.19.2
      (the 26 line is ahead of Node 24). Rust side: nothing pending.

## Deferred (T4 parity — webpack-only, revisit if Turbopack-compatible)

- [ ] Million.js — React compiler. DEFERRED: webpack-only, incompatible with
      Turbopack (Next 16 default) + React 19. Revisit if a Turbopack-compatible
      compiler or a new maintained option emerges.
- [ ] PattyCake — zero-runtime ts-pattern compiler. DEFERRED: same webpack/
      Turbopack concern. Revisit alongside Million.js.

## Blocked (Expo Go — decided, not changing)

- `@react-native-async-storage/async-storage` 2.2.0 → 3.1.1 (major, mobile only).
  BLOCKED while on Expo Go: SDK 58's `bundledNativeModules.json` pins 2.2.0, so
  a 3.x JS bump desyncs the native module and breaks Expo Go (same class as the
  expo-audio playback service). Decided: keep 2.2.0 while on Expo Go. Revisit
  only when moving to a dev/release build or a future SDK that bundles 3.x.

## New features (planned — docs/specs created 2026-10-23)

- [ ] Push notifications (SPEC-notifications.md) — Web Push (VAPID) + Expo Notifications + Tauri native. Cloudflare Worker dispatch. Free tier. Depends on: none.
- [ ] Offline/no-connection handling (SPEC-offline.md) — player retry, TanStack Query offline persistence, service worker. Free tier. Depends on: none.
- [ ] Cloudflare media storage (SPEC-media-storage.md) — R2 upload + image optimization (lazy loading, WebP/AVIF, blur placeholder). Free tier (10GB + 1M ops/month). Depends on: none. Blocks: business-directory photos, ads-display flyers, owner-portal uploads, radio-spots audio.
- [ ] Chatbot with Cloudflare Workers AI — update SPEC-owner-portal.md (replaces Gemini with Workers AI, free: 10k neurons/day). Depends on: owner-portal auth (Supabase).
- [ ] Image loading optimization for flyers — part of SPEC-media-storage (responsive sizes, lazy loading, blur placeholder). Depends on: SPEC-media-storage.
