# Expo SDK 58 — mobile runtime upgrade

Branch: `feature/expo-sdk-58` · Delivery: `ask-on-risk` · Runner: `pnpm test` (node:test + vitest + turbo)
Commit hash is recorded in the closing entry once device verification lands.
Objective: move the mobile workspace from Expo SDK 57 (RN 0.86.3) to SDK 58 (RN 0.88.0) and record whether it is feasible, keeping Tamagui at 2.7.7.

## Specs

- **S1 — Pin set.** Adopt the exact versions from `expo@58.0.16`'s `bundledNativeModules.json`:
  `expo 58.0.16`, `expo-audio 58.0.9`, `expo-font 58.0.9`, `expo-localization 58.0.5`,
  `expo-router 58.0.24`, `expo-status-bar 58.0.3`, `babel-preset-expo 58.0.18`,
  `react 19.3.0`, `react-dom 19.3.0`, `react-native 0.88.0`,
  `react-native-gesture-handler 3.3.0`, `react-native-reanimated 4.7.1`,
  `react-native-safe-area-context 5.10.1`, `react-native-screens 4.30.0`,
  `react-native-web 0.21.4`, `@react-native-async-storage/async-storage 2.2.0`.
- **S2 — Exact pins.** No carets or tildes in `package.json` (project rule); the `catalog:` entries stay exact.
- **S3 — Tamagui stays at 2.7.7.** Tamagui 3 is out of scope for this slice. A failure that requires Tamagui 3 is reported, not silently bundled into this upgrade.
- **S4 — One source of truth.** Context-carrying packages live in the `pnpm-workspace.yaml` catalog and must resolve to one physical copy each (`pnpm check:singletons`).
- **S5 — Gates green.** `check:singletons`, `typecheck` 7/7, `test` 7/7, `biome check`, web e2e 12/12, and `expo export --platform android` succeeds.
- **S6 — Verdict.** The feature document records whether Tamagui 2.7.7 runs on RN 0.88, with the evidence that proves it, or the exact blocker.

## Tasks

- [x] T1 — Bump the catalog and the three manifests (S1, S2, S3, S4). No source change was needed.
- [x] T2 — Install and resolve upgrade fallout (S1, S5). No fallout: guard, typecheck, tests and bundle passed on the first install.
- [x] T3 — Run every gate and record the verdict (S5, S6). All gates green; verdict in L3.

## Log

- **L1 — 2026-10-19, user request (verbatim):**
  > User approved exploring the Expo SDK 58 upgrade to check feasibility.
- **L2 — 2026-10-19, feasibility evidence (read-only):**
  - `expo` `latest` is `58.0.16`: SDK 58 is stable, not a prerelease.
  - `expo@58.0.16` declares `node: ^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0`; host runs Node 24.14.0 → supported.
  - RN 0.88 release notes title: "no breaking changes" (third consecutive release without user-facing breaks); React bumped to 19.3.0, Metro 0.87.
  - `tamagui@3.0.18` peers are `react >=19` and `react-native-safe-area-context *` — it does **not** require RN 0.88, so the upgrade order is not inverted.
  - `tamagui@2.7.7` touches RN internals in exactly one place: `@tamagui/portal` `native-portal.native.js` requires `react-native/Libraries/Renderer/shims/ReactFabric` inside a `try/catch`, and only when Fabric is active. That file still exists in `react-native@0.88.0` (HTTP 200 on unpkg); the legacy `ReactNative` shim is gone (HTTP 404) but is only used on the old architecture.
  - The app does not use Tamagui `Portal`, `Dialog`, `Sheet`, `Select`, `Popover` or `Toast`; its "sheet" is a local component (`StationSheetCard`).
  - Real breaking surface from the SDK 58 changelog, checked against this repo: RN Strict TypeScript API default (no `react-native/Libraries/*` deep imports in our code), removals of `InteractionManager` / `Touchable` root export / `NativeMethods` / `Modal.animated` / StatusBar legacy props (all unused), Expo Router navigation-core rework (we only render `<Stack>`; no `router.*`, no `Link`, no custom navigator), `expo-localization` iOS RTL (es/en only), `expo-file-system` async write (unused), Android R8 default in release (no release build here).
  - `expo-audio@58` breaking changes are recorder-only plus an Android audio-focus default; our surface (`useAudioPlayer`, `useAudioPlayerStatus`, `setAudioModeAsync`, `replace`, `play`, `pause`) is unaffected. SDK 58 also adds lock-screen controls with playlists, which unblocks the `Native Now Playing` backlog item.
- **L3 — 2026-10-19, result.** Feasible, with no source change required.
  - `pnpm check:singletons`: `ok: 11 singletons, one physical copy each`.
  - `pnpm typecheck`: 7/7, including `mobile` against the RN Strict TypeScript API (we never deep-import `react-native/Libraries/*`).
  - `pnpm test`: 8/8 guard probes + 7/7 turbo tasks. `biome check`: 102 files, no fixes.
  - Web e2e (es/en, port 3000): 12/12.
  - `expo export --platform android`: exit 0. Source map shows one variant each: `react@19.3.0`, `react-native@0.88.0`, `@tanstack+react-query@5.104.4_@types+react@19.3.0_react@19.3.0`, `tamagui@2.7.7_..._react-native@0.88.0_...`, `zod@4.6.7`. 1908 modules.
  - Tamagui 2.7.7 verdict: bundles and typechecks on RN 0.88.0; its Fabric portal shim resolves. Runtime proof on the emulator is still pending, and it is the only remaining gate.
  - `expo install --check` reports one advisory: `typescript@5.9.3` vs expected `~6.0.3`. Left out of this slice on purpose: the TypeScript line already has its own backlog slice, typecheck passes 7/7 across all packages, and bundling is unaffected. Recorded as debt instead of widening this upgrade.
  - `pnpm peers check` keeps the pre-existing `@react-native/metro-config` mismatch (now 0.87.1 installed vs 0.88.0 wanted); it does not affect bundling, tests or typecheck.
  - Untouched on purpose: `@react-native-async-storage/async-storage` stays 2.2.0 (SDK 58 keeps that pin) and Tamagui stays 2.7.7 (S3).
- **L4 — 2026-10-19, device verification (emulator-5554).** S6 is satisfied: Tamagui 2.7.7 runs on RN 0.88.
  - Blocker, not a project defect: the emulator had Expo Go `57.0.9`, and Expo Go for SDK 58 is not on Play Store yet ("will be released within a few weeks", per the SDK 58 changelog). The official APK is published at `expo/expo-go-releases`: `Expo-Go-58.0.5.apk`. Installed with `adb install -r` (versionCode 465); app data survived.
  - Reaching Metro: the `exp://<LAN-IP>:8081` deep link left Expo Go on its spinner with no connection to Metro. `adb reverse tcp:8081 tcp:8081` plus `exp://127.0.0.1:8081` connects. Use the reverse tunnel for the emulator from now on.
  - Verified on device: cold boot with no red screen and no `No QueryClient set`; landing renders the full composition; listener count shows 42 (the zod 4 path); pause → resume flips the status and the button; the station sheet opens listing Test Pop / Test Jingle / Test Night with the active check; switching to Test Pop swaps the title and keeps playing.
  - **Regression found and fixed:** expo-router 58 shows the stack header by default where expo-router 57 hid it, so the landing rendered a white `index` bar. Fixed with `headerShown: false` on the root `Stack` `screenOptions`. The mobile workspace still has a scaffold-only test script, so this fix has no automated test; the emulator screenshots are the recorded functional evidence (test-first exception).
  - Screenshots kept outside the repository (`/tmp/opencode/sdk58-*.png`).
