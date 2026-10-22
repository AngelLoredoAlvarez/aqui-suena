# Backlog — aqui-suena

Cross-feature TODO list. Items land here when they are out of scope for the
active feature but must not be lost. Checked items move to Engram, not deleted.

Last synced 2026-10-22 against `main` d47dad4 (deps-followups branch).

## Player / playback

- [ ] Android media notification: the system controls still show an inert
      previous button and a progress line for the finite dev assets
      (follow-up from native-now-playing, closed 2026-10-19). Not observable
      headless: Expo Go ships a fixed manifest, so the playback service only
      exists in a development or release build (see the comment in
      `packages/ui/src/drivers/expo-driver.native.ts`).

## Restyle follow-ups (from player-restyle-01)

- [ ] Wide desktop composition (1440): no design evidence in section 01
      (mobile only). Needs tablet/web variant input before composing. Nothing
      composes for wide viewports yet: the config keeps Tamagui's default
      media untouched and the shared surfaces only cap width (`maxW` 390/480).
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
- [ ] `@react-native-async-storage/async-storage` 2.2.0 → 3.1.1 (major,
      mobile only). BLOCKED while on Expo Go: SDK 58's
      `bundledNativeModules.json` pins 2.2.0, so a 3.x JS bump desyncs the
      native module and breaks Expo Go (same class as the expo-audio playback
      service). Defer until a dev/release build or a future SDK that bundles
      3.x.
- Patch/minor bumps applied 2026-10-22 (`chore/deps-typescript`):
      `@tanstack/react-query` 5.104.5, `@tauri-apps/api`/`@tauri-apps/cli`
      2.12.4, `turbo` 2.11.10, `dependency-cruiser` 18.7.0, `tamagui` +
      `@tamagui/config` 3.1.2. `react`/`react-dom` were bumped to 19.3.1 then
      REVERTED to 19.3.0 to match Expo SDK 58. `@types/node` stays at 24.19.2
      (the 26 line is ahead of Node 24). Rust side: nothing pending.
