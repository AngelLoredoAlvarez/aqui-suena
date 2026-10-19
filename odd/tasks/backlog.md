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

- [ ] align-react: move web+ui+native together (never bump React in one
      package — dual-copy breakage).
- [ ] TypeScript migration (major line, touches every package). The
      backlog said "TypeScript 6"; latest on 2026-10-19 is 7.0.2 against
      an installed 5.9.3.
- [ ] Tamagui 3 migration (major, needs dedicated slice): `tamagui` and
      `@tamagui/config` 2.7.7 → 3.0.18, four packages.
- [ ] Expo SDK 58 block: ~15 coordinated packages, do not split (see
      align-react). Includes react/react-dom 19.3.1, react-native
      0.86.3 → 0.88.0, reanimated, screens, safe-area-context,
      @types/react 19.3.0.
- [ ] zod 3 → 4 in `@aqui-suena/api`: isolated, the cheapest slice.
      Frontier verified 2026-10-19: 23 packages in these four slices;
      the Rust side has nothing pending (tauri 2.12.4 / tauri-build 2.7.3
      are latest).

## Repo hygiene

- [ ] e2e `apps/web/e2e/player.spec.ts` is red on `main`: 10 passed /
      2 failed — one test, "aborted primary mirror engages fallback and
      keeps playing", failing in both locale projects at the
      `primary mirror requested` assertion. It asserts a two-mirror
      `/api/stream` flow the current fixture cannot reach: test channels
      are relative `/test-streams/*.m4a`, so the web driver never proxies
      through `/api/stream`. The capability itself is live
      (`use-player.ts` calls `pickFallbackUrl`) and unit-covered in
      `packages/player/src/fallback/fallback.test.ts`. Decision pending:
      rewrite the spec against a two-URL fixture, or drop it as already
      covered by the unit suite.
