# Native Now Playing — lock-screen and notification controls

Branch: `feature/native-now-playing` · Delivery: `ask-on-risk` · Runner: `pnpm test` + device
Objective: publish the playing station to the system media session so the notification shade and the lock screen show metadata and play/pause controls, and keep the in-app state in sync when the OS drives playback.

## Specs

- **S1 — Native service enabled.** `apps/mobile/app.json` registers the `expo-audio` config plugin as `["expo-audio", { "recordAudioAndroid": false }]`. The generated manifest must declare `expo.modules.audio.service.AudioControlsService` with `foregroundServiceType="mediaPlayback"` plus `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_MEDIA_PLAYBACK`. `RECORD_AUDIO` must not be requested: the app never records, and the plugin's default would ask for it.
- **S2 — Metadata.** The lock screen shows the current station name as `title` and the app name (`dictionary.appTitle`, "Aqui Suena" in both locales) as `artist`. The player is registered with `isLiveStream: true`, so the OS hides duration and scrubbing and disables seek; no next/previous buttons.
- **S3 — One active player.** Only the player that actually reached `playing` is active for lock screen controls, because mirror rotation may settle on either of the driver's two players. Switching stations clears the previous player's controls so the notification never points at a stopped mirror.
- **S4 — OS → app sync.** A pause or resume from the system UI updates the in-app status through the driver's playback subscription. Events that arrive while the app is `loading` are ignored, so the internal pause of the previous player during a station switch cannot flip the UI to `paused`.
- **S5 — Web unaffected.** The lock-screen surface is native-only. The web driver keeps implementing only `play` and `pause`, and `usePlayer` treats the new driver methods as optional.
- **S6 — Verification.** Unit tests cover metadata publication, clearing on failure, the active-player switch and the external-event sync. Device verification on the emulator shows the media notification and a working pause from the system UI.

## Tasks

- [x] T1 — Register the `expo-audio` config plugin and inspect the generated manifest (S1).
- [x] T2 — Extend `AudioDriver` with optional now-playing and playback-subscription methods; implement them in the native driver with tests (S2, S3, S4, S5).
- [x] T3 — Add the `nowPlaying` prop to `usePlayer`, publish on success, clear on error, handle external events (S4, S5).
- [x] T4 — Pass the station name from the landing to the player (S2).
- [x] T5 — Verify on the emulator: notification, lock screen, system pause, station switch (S1–S4).

## Log

- **L1 — 2026-10-19, user request (verbatim):**
  > si
  Answering: "¿Arrancamos con Native Now Playing?" The backlog entry (2026-10-15) defines the outcome: "while a station plays, show track/station metadata with controls in the system UI (notification shade + lock screen), like YouTube Music / browsers do".
- **L2 — 2026-10-19, exploration (read-only).**
  - `expo-audio@58.0.9` exposes `player.setActiveForLockScreen(active, metadata?, options?)`, `updateLockScreenMetadata(metadata)`, `clearLockScreenControls()` and `AudioMetadata = { title?, artist?, albumTitle?, artworkUrl? }`. `AudioLockScreenOptions` includes `isLiveStream`, which hides duration and the scrub bar.
  - The same package ships a config plugin (`app.plugin.js` → `withAudio`) that declares `AudioControlsService`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, iOS `UIBackgroundModes: ["audio"]`, and requests `RECORD_AUDIO` unless `recordAudioAndroid: false`. It is **not** registered in `app.json`, and the generated manifest has no service or foreground permissions, so lock-screen controls cannot work today.
  - The docs attached to the API require `interruptionMode` to be `doNotMix`; the driver already sets `interruptionMode: "doNotMix"`, `shouldPlayInBackground: true` and `playsInSilentMode: true`.
  - The current driver alternates two players for mirror rotation and commits one only after it reports `playing`; the previous player is paused at that moment. That is the only correct point to mark a player active for the lock screen.
  - `usePlayer` owns the app-facing status and only knows URLs, so the station name has to reach it as a prop; the landing already has `channel.name`.
- **L3 — 2026-10-19, risk.** Risk: item 4 — playback state changes are event-ordered (native status transitions, mirror rotation and OS-driven commands), and a wrong guard surfaces as a wrong play/pause state rather than a compile error.
- **L4 — 2026-10-19, implementation and device evidence.**
  - **Dependency ownership.** The config plugin is resolved from the app, so `expo-audio` moved to the workspace catalog (`58.0.9`) and is now declared by both `apps/mobile` (plugin) and `packages/ui` (driver). Added to `scripts/check-singletons.mjs`: `ok: 12 singletons, one physical copy each`.
  - **T1 evidence.** `expo prebuild --platform android` regenerated the project; the manifest now carries `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `MODIFY_AUDIO_SETTINGS` and `expo.modules.audio.service.AudioControlsService` with `android:foregroundServiceType="mediaPlayback"`. No `RECORD_AUDIO`.
  - **Crash found on device and fixed.** The first build crashed with `java.lang.IllegalStateException: Session ID must be unique. ID=ExpoAudioLockScreenSession_<player>` at `AudioControlsService.kt:512`: the driver activated the session when playback committed and `usePlayer` activated it again with the same metadata right after the play promise resolved, and the Android service builds one session per player. Fixed with an idempotent `publish`: first activation creates the session, later metadata for the same player goes through `updateLockScreenMetadata`. Regression test: "updates metadata instead of rebuilding the session on the same player". No crash after the fix on the switch path that reproduced it. After the L5 cleanup, `setNowPlaying` is the driver's only publisher: the commit-time activation and `metadataRef` are gone, so the duplicate is structurally impossible and the guard remains as defense in depth.
  - **T2/T3 tests.** `@aqui-suena/player` 29 passed (4 new: metadata published on success, cleared when every mirror fails, system pause/resume reflected, events ignored while loading). `@aqui-suena/ui` native driver 13 passed (4 new: activation with live-stream options, session hand-off on player rotation, idempotent activation, events only for the committed player).
  - **T5 device evidence, `emulator-5554`, debug build + Metro.** Media session `ExpoAudioLockScreenSession_*` for `com.seventeenlabs.aquisuena`, metadata `description=Test Pop, Aqui Suena, null`, foreground service started (`Background started FGS: Allowed ... AudioControlsService`). Notification shade shows the media card with title/artist and pause. `adb shell cmd media_session dispatch pause` turned the session to `PAUSED` and the app showed **Resume** without any in-app interaction; `dispatch play` returned the session to `PLAYING` and the app showed **Pause**. Station switch moved the metadata to the new station.
  - **Observation (not a blocker).** On Android the notification still renders a previous-track glyph and a progress line while the finite dev asset plays, even with `showPreviousTrack: false` and `isLiveStream: true`; the glyph is inert (no playlist) and the progress line tracks the file duration, which a real live stream does not report. Worth revisiting with a real stream, out of scope for this slice.
- **L5 — 2026-10-19, user correction (verbatim):**
  > si limpialos, y tambien remueve los comentarios que hayas colocado en el codigo

  Cleanup applied:
  - `publish`/`release` are now `useCallback` with empty deps, so the effect and the memoized driver share one stable function instead of the first render's closure.
  - The driver publishes from a single path: `setNowPlaying`. The commit-time activation and `metadataRef` were deleted; `usePlayer` publishes after the play promise resolves and again when the metadata changes while playback is settled.
  - `createFakeDriver` now ships `setNowPlaying`, `subscribePlayback` and `emitPlayback`, so the four new hook tests no longer monkey-patch the driver. Driver tests publish after playback settles, matching the real contract.
  - Every comment added by this slice was removed; pre-existing comments stayed (`@vitest-environment`, `toMediaFailure`, the shared-driver block, the `attempt` invariant note).
  - Verification after the cleanup: player 29, ui 13, typecheck, biome, `check:singletons` 12 and web e2e 12/12 green. Device: session with `Test Pop`, system pause turned the app to **Resume**, station switch moved the metadata to `Test Night`, no `Session ID must be unique` and no fatal exception.
