# Backlog — aqui-suena

Cross-feature TODO list. Items land here when they are out of scope for the
active feature but must not be lost. Checked items move to Engram, not deleted.

Last synced 2026-10-21 against `main` 2c496c0.

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

- [ ] Metro vs react-native question, still unconfirmed: `metro` 0.87.1 is
      resolved through `@expo/metro` 58.0.0, while `react-native` 0.88.0
      declares no metro dependency and `@react-native/metro-config` 0.88 is
      not installed. Find where the original peer warning came from before
      acting on it.

## Dependencies (scheduled slices, not bedtime)

- [ ] TypeScript migration (major line, touches every package). Latest on
      2026-10-21 is 7.0.2, and `expo install --check` on SDK 58 expects
      `~6.0.3` against the installed 5.9.3. The upgrade stays out until the
      target line is chosen.
- [ ] `@react-native-async-storage/async-storage` 2.2.0 → 3.1.1 (major,
      mobile only). Not started.
- Frontier verified 2026-10-21 with `pnpm outdated -r`: patch bumps only for
      react 19.3.0 → 19.3.1, react-dom 19.3.0 → 19.3.1, @tanstack/react-query
      5.104.4 → 5.104.5, @tauri-apps/api 2.12.3 → 2.12.4, turbo 2.11.9 →
      2.11.10 and dependency-cruiser 18.6.0 → 18.7.0; `@tamagui/config` 3.0.18
      → 3.1.0 is the only minor. `@types/node` is installed at 24.19.2 and the
      26 line is ahead of the Node 24 runtime, so it stays. The Rust side has
      nothing pending (tauri 2.12.4 / tauri-build 2.7.3).
