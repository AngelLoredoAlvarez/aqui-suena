# Backlog — aqui-suena

Cross-feature TODO list. Items land here when they are out of scope for the
active feature but must not be lost. Checked items move to Engram, not deleted.

## Player / playback

- [x] Native Now Playing: while a station plays, show track/station metadata
      with controls in the system UI (notification shade + lock screen),
      like YouTube Music / browsers do. Requested 2026-10-15.
      Done 2026-10-19: `expo-audio` lock-screen session wired through the
      driver and `usePlayer`; see `odd/tasks/native-now-playing.md`.
      Follow-up: the Android notification still shows an inert previous
      button and a progress line for the finite dev assets.

## Restyle follow-ups (from player-restyle-01)

- [ ] Wide desktop composition (1440): no design evidence in section 01
      (mobile only). Needs tablet/web variant input before composing.
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
      Verified state 2026-10-19: CLI installed as an exact devDependency
      (`@tauri-apps/cli` 2.12.3) and the root `pnpm build` command
      resolution failure is gone. Blockers, all verified: (a) system —
      `net-libs/webkit-gtk:4.1` is absent and is the only thing stopping
      `cargo check`; the installed slot `6/0` is GTK4 and useless to
      Tauri; (b) tray — `x11-misc/snixembed` is installed but has no
      `~/.config/autostart/` entry, and XFCE has no SNI host, so the tray
      icon will not appear until autostart is wired; (c) bundle-only and
      inert in dev mode — `frontendDist` points at `apps/web/out`, which
      does not exist and cannot (the web app is a Next server build with
      no `output: 'export'`), and `bundle.icon` is empty with
      `targets: "all"`. `@tauri-apps/api` is NOT required for the tray:
      it is built in Rust, and `Cargo.toml` already declares the
      `tray-icon` and `image-ico` features.

## Dependencies (scheduled slices, not bedtime)

- [x] align-react — done 2026-10-19. `@types/react` and `@types/react-dom`
      pinned at 19.3.0 through the `pnpm-workspace.yaml` catalog plus
      `overrides`, enforced by `scripts/check-singletons.mjs` in the
      pre-commit hook. A partial bump now fails at commit time instead of
      forking the runtime module graph.
- [x] zod 3 → 4 in `@aqui-suena/api` — done 2026-10-19.
- [x] Expo SDK 58 — done 2026-10-19 on `feature/expo-sdk-58`: expo
      58.0.16, RN 0.88.0, react/react-dom 19.3.0, gesture-handler 3.3.0,
      reanimated 4.7.1, safe-area 5.10.1, screens 4.30.0, router 58.0.24,
      audio 58.0.9. No source change was needed. Pending only device
      verification on the emulator.
- [ ] TypeScript migration (major line, touches every package). Two
      datums for whoever schedules it: latest on 2026-10-19 is 7.0.2, and
      `expo install --check` on SDK 58 expects `~6.0.3` against the
      installed 5.9.3. Upgrade stays out of the dependency slices until
      the target line is chosen.
- [ ] Tamagui 3 migration (major, needs dedicated slice): `tamagui` and
      `@tamagui/config` 2.7.7 → 3.0.18, four packages. No longer coupled
      to the SDK: Tamagui 2.7.7 typechecks and bundles on RN 0.88, and
      `tamagui@3` does not require RN 0.88 either.
- [ ] `@types/node` 22.20.5 → the 24 line (24.19.2), matching the host
      Node 24.14.0. The 26 line is ahead of the runtime and was rejected.
- Frontier verified 2026-10-19: the Rust side has nothing pending
      (tauri 2.12.4 / tauri-build 2.7.3 are latest).
