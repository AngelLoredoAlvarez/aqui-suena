# Backlog — aqui-suena

Cross-feature TODO list. Items land here when they are out of scope for the
active feature but must not be lost. Checked items move to Engram, not deleted.

Last synced 2026-10-20 against `main` b529742.

## Player / playback

- [ ] Android media notification: the system controls still show an inert
      previous button and a progress line for the finite dev assets
      (follow-up from native-now-playing, closed 2026-10-19).

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

- [ ] Desktop app via Tauri v2 (dev-only, no Windows signing or publishing
      yet): reuses the web app in a webview. REQUIREMENT: system tray icon
      (taskbar/dock/menubar presence like media apps). Accepted 2026-10-15:
      the user already verifies 2 platforms and one more is marginal cost.
      Verified state 2026-10-21 — tray menu complete and verified by hand:
      (a) system dependency — `net-libs/webkit-gtk:4.1` is installed
      (2.54.0) and `cargo check` passes; the missing-slot blocker is gone.
      (b) tray host — the XFCE 4.20.8 panel `systray` plugin is itself the
      `org.kde.StatusNotifierWatcher`, so SNI items render natively and
      `snixembed` cannot even acquire the watcher name.
      (c) icons — the 1024px brand set is generated into
      `apps/desktop/src-tauri/icons/` and the tray uses `32x32.png`
      (commit b529742).
      (d) menu — Rust renders the model the webview publishes: play/pause,
      a stations submenu with a check on the active station, show/hide and
      quit, all localized by the webview. Rust owns no state and no
      translations. `beforeDevCommand` fixed to `pnpm --dir ../.. dev:web`.
      (e) two runtime requirements found while verifying: the Linux
      AppIndicator backend does not publish the item until a menu is set (an
      empty one is enough; the first published model replaces it), and the
      webview needs a capability granting `core:event:default` or every
      `emit`/`listen` is rejected. On Linux the click events and the tooltip
      are unsupported by that backend, so the menu item is the only way to
      show the window.
      (f) verified by hand on the panel: play/pause, station switch with the
      check moving, live language switch, show/hide and quit.
      Remaining: packaging only — `tauri build` cannot bundle because
      `frontendDist` points at `apps/web/out`, which does not exist while the
      web app stays a Next server build with no `output: 'export'` — plus
      Windows/macOS signing, out of scope while the desktop stays dev-only.

## Verification gaps

- [ ] Metro 0.87.1 vs react-native 0.88.0 peer mismatch: suspected to be
      the `@expo/metro@58` pin rather than a real fork. Confirm before
      acting on it.

## Dependencies (scheduled slices, not bedtime)

- [ ] TypeScript migration (major line, touches every package). Two datums
      for whoever schedules it: latest on 2026-10-20 is 7.0.2, and
      `expo install --check` on SDK 58 expects `~6.0.3` against the installed
      5.9.3. The upgrade stays out until the target line is chosen.
- [ ] `@react-native-async-storage/async-storage` 2.2.0 → 3.1.1 (major,
      mobile only). Not started.
- Frontier verified 2026-10-20 with `pnpm outdated -r`: the remaining bumps
      are patches only — react 19.3.1, react-dom 19.3.1,
      @tanstack/react-query 5.104.5, react-native-gesture-handler 3.4.0.
      `@types/node` is installed at 24.19.2 and the 26 line is ahead of the
      Node 24 runtime, so it stays. The Rust side has nothing pending
      (tauri 2.12.4 / tauri-build 2.7.3).
