# fix/android-player-safe-area

Status: open. Reported 2026-11-13 after installing the staging APK on a physical
Android device.

Objective: keep the bottom player fully usable above the Android system
navigation bar, without changing the approved visual design.

## Problem

On the physical Android device, the player dock renders underneath the system
navigation area (the gesture/3-button bar used to go back or minimize the app).
The bottom edge of the card and its controls are obscured or too close to the
system bar, so the player is not fully usable.

## Expected

- The interactive part of the player sits entirely above the system navigation
  bar in both gesture and 3-button navigation modes.
- The screen background may extend behind the system bar; only the interactive
  content is padded.
- Web and desktop keep their current spacing; no extra gap is introduced there.

## Evidence and context

- Build: EAS staging APK `bfeaf518-872a-4597-ab73-a20df1b3f18d` (Android,
  internal distribution), commit `cf9dd4c`.
- Local investigation: no safe-area usage exists in the landing or player code
  (`grep` for `useSafeAreaInsets` / `SafeArea` finds nothing).
- `PlayerLanding` sets a fixed bottom padding:
  `packages/ui/src/player-landing/player-landing.tsx:98` (`pb={isWide ? 24 : 8}`).
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

- Bottom inset handling for the landing and player dock on native.
- Guarding web/desktop so their spacing stays unchanged.
- Manual verification on a physical Android device in gesture and 3-button
  navigation.

Out of scope:

- Redesigning the player dock, card or station sheet.
- Top status-bar inset if it is already correct.
- Web/desktop layout changes.

## Tasks

- T1: inspect `SafeAreaProvider` coverage in the mobile root and the player
  layout tree; document the inset source.
- T2: apply the bottom inset to the landing/player dock (padding or margin),
  skipping it on web/desktop.
- T3: add a test with mocked insets proving the dock's bottom spacing includes
  the inset and stays unchanged on web.
- T4: install the staging APK on the physical device and verify gesture and
  3-button navigation; attach screenshots.

## Acceptance criteria

- On the physical Android device, the player card's bottom edge is above the
  system navigation bar and every control is tappable.
- Switching to 3-button navigation keeps the player visible.
- Web and desktop screenshots show no added gap.
- `typecheck`, UI tests and `biome check .` stay green.

## Log

- L1 (2026-11-13): Issue reported after the first successful physical-device
  install of the staged APK. The player appeared below the Android system
  navigation menu. Documentation created; no code change yet.
