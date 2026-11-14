# fix/android-player-safe-area

Status: implemented, pending device verification. Reported 2026-11-13 after
installing the staging APK on a physical Android device.

Objective: keep the landing clear of native system bars on Android (status and
navigation) and iOS (notch/Dynamic Island and home indicator), without changing
the approved visual design.

## Problem

The bug was reported on a physical Android device: the player dock renders
underneath the system navigation area (the gesture/3-button bar used to go back or minimize the app).
The bottom edge of the card and its controls are obscured or too close to the
system bar, so the player is not fully usable. The same missing-inset issue applies to the top: the title and locale switcher
can sit under the status bar, because the landing uses fixed top padding and no
safe-area insets. iOS uses the same layout and also has no inset handling, so it
can overlap the notch/Dynamic Island or the home indicator; that path is
untested today.

## Expected

- The top content (title and locale switcher) sits below the status bar on
  Android and below the notch/Dynamic Island on iOS.
- The interactive part of the player sits entirely above the system navigation
  bar on Android (gesture and 3-button modes) and above the home indicator on
  iOS.
- The screen background may extend behind the system bar; only the interactive
  content is padded.
- Web and desktop keep their current spacing; no extra gap is introduced there.

## Library clarification

`react-native-safe-area-context` reports the native safe-area insets, including
the iOS notch/Dynamic Island and the Android system bars. It does **not** apply
them automatically: a layout must consume `useSafeAreaInsets` (or a safe-area
component) and read `top`/`bottom`. The bug exists because the landing never
consumed the context, not because the library cannot detect the notch.

## Evidence and context

- Build: EAS staging APK `bfeaf518-872a-4597-ab73-a20df1b3f18d` (Android,
  internal distribution), commit `cf9dd4c`.
- Local investigation: no safe-area usage exists in the landing or player code
  (`grep` for `useSafeAreaInsets` / `SafeArea` finds nothing).
- `PlayerLanding` sets fixed top and bottom padding:
  `packages/ui/src/player-landing/player-landing.tsx` (`pt={isWide ? 24 : 20}`,
  `pb={isWide ? 24 : 8}`).
- `PlayerDock` positions the card without any bottom inset
  (`packages/ui/src/player-landing/player-dock.tsx`).
- `react-native-safe-area-context` is already a mobile dependency.

## Likely cause

The closed layout does not read the device's bottom safe-area inset. On Android
with edge-to-edge/navigation gestures, the drawable area extends behind the
system bar, and fixed padding is not enough. This is a layout bug, not a design
change.

## Scope

In scope:

- Top and bottom inset handling for the landing and player dock on all native
  platforms (Android and iOS).
- Guarding web/desktop so their spacing stays unchanged.
- Manual verification on a physical Android device in gesture and 3-button
  navigation.

Out of scope:

- Redesigning the player dock, card or station sheet.
- Top status-bar inset if it is already correct.
- Web/desktop layout changes.

## Tasks

- [x] T1: inspect `SafeAreaProvider` coverage in the mobile root and the player
  layout tree; document the inset source. DONE: the mobile root now wraps the
  app in `SafeAreaProvider`.
- [x] T2: apply the top inset to the landing content and the bottom inset to the
  player dock (padding or margin), skipping both on web/desktop. DONE: a
  native-only hook reads the insets; web resolves to zero.
- [x] T3: add a test with mocked insets proving the top and bottom spacing
  include the insets and stay unchanged on web. DONE:
  `player-spacing.test.ts`.
- T4: verify Android on the physical device (gesture and 3-button navigation)
  and iOS on a simulator or device (notch/Dynamic Island and home indicator);
  attach screenshots.

## Acceptance criteria

- On the physical Android device, the title and locale switcher are below the
  status bar, and the player card's bottom edge is above the system navigation
  bar with every control tappable.
- On iOS, the title clears the notch/Dynamic Island and the player clears the
  home indicator.
- Switching to 3-button navigation keeps the player visible.
- Web and desktop screenshots show no added gap.
- iOS simulator/device screenshots show no overlap in portrait.
- `typecheck`, UI tests and `biome check .` stay green.

## Log

- L1 (2026-11-13): Issue reported after the first successful physical-device
  install of the staged APK. The player appeared below the Android system
  navigation menu. Documentation created; no code change yet.
- L2 (2026-11-13): Scope extended to the top status bar. The landing has the same
  missing-inset problem at the top: fixed `pt` and no safe-area read.
- L3 (2026-11-13): Confirmed the fix must cover iOS too. The safe-area API is
  cross-platform; iOS has the notch/Dynamic Island and home indicator instead of
  Android system bars. iOS verification is added; the bug was reported on
  Android only.
- L4 (2026-11-13): Implemented on this branch. Added a native-only
  `usePlayerInsets` hook backed by `useSafeAreaInsets`, a zero-inset web
  fallback, a pure `playerSpacing` helper with tests, and `SafeAreaProvider` in
  the mobile root. `packages/ui` now declares
  `react-native-safe-area-context`. Pending: install a new APK on the physical
  Android device and verify gesture/3-button modes; iOS simulator verification
  remains.
