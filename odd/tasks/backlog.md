# Backlog — aqui-suena

Cross-feature TODO list. Items land here when they are out of scope for the
active feature but must not be lost. Checked items move to Engram, not deleted.

## Player / playback

- [ ] Native Now Playing: while a station plays, show track/station metadata
      with controls in the system UI (notification shade + lock screen),
      like YouTube Music / browsers do. Native capabilities work; needs a
      player that publishes metadata (evaluate expo-audio vs dev-client
      options when the slice is scheduled). Requested 2026-10-15.

## Restyle follow-ups (from player-restyle-01)

- [ ] Wide desktop composition (1440): no design evidence in section 01
      (mobile only). Needs tablet/web variant input before composing.
- [ ] R3b-3: remove inline chips now that the sheet is the selector
      (migrate channels tests that drive chips).
- [ ] Empty + ad-countdown states → ads-display / owner modules
      (no triggers exist yet).
- [ ] System-following themes (useColorScheme → noche/brasa) + brasa
      headed verification.
- [ ] Tamagui `ZStack` cleanup for the overlay (idiomatic primitive,
      discovered during overlay work).

## Platforms (accepted for development, dev-only)

- [ ] Desktop app via Tauri v2 (dev-mode only, no Windows signing or
      publishing yet): reuses the web app in a webview. REQUIREMENT:
      system tray icon (taskbar/dock/menubar presence like media apps).
      Accepted 2026-10-15 — user already verifies 2 platforms, one more
      is marginal cost. Open for kickoff: tray menu contents (play/pause?
      station switch?), first dev OS, packaging later.
      Starts as its own feature (desktop-tauri-dev), next session.

## Dependencies (scheduled slices, not bedtime)

- [ ] align-react: move web+ui+native together (never bump React in one
      package — dual-copy breakage).
- [ ] TypeScript 6 migration (major line, touches every package).
- [ ] Tamagui 3 migration (major, needs dedicated slice).
