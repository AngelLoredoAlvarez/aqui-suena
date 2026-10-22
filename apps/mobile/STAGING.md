# Staging build for the mobile app

Staging is a release-mode Android build that talks to the deployed backend and
the deployed web assets. It never talks to localhost. `EXPO_PUBLIC_*` values are
inlined into the JS bundle at build time, so changing an endpoint requires
rebuilding the APK.

| Purpose | Variable | Value |
| --- | --- | --- |
| Worker base for the shared API client and `/stream` proxy | `EXPO_PUBLIC_API_BASE_URL` | `https://aqui-suena-api.angel-loredo-alvarez.workers.dev` |
| `/test-streams/*` fixtures used by the native player | `EXPO_PUBLIC_STREAM_BASE_URL` | `https://aqui-suena-web.pages.dev` |

Two bases are required because a native app has no same-origin server. The test
fixtures live in `apps/web/public/test-streams` and are deployed to Cloudflare
Pages; the native player uses them directly. The Worker base is the shared API
contract and the `/stream` proxy the web driver uses; the native bundle bakes it
so the staging app matches that contract, even though the current native driver
plays the Pages fixtures directly.

The endpoints are defined once in `apps/mobile/eas.json` under
`build.staging.env`. Both build paths below read them from there, so the local
APK and the EAS build cannot drift apart. Native requests send no `Origin`
header, which the Worker allows.

## Local release APK

Prerequisites:

- JDK 17.
- Android SDK with platform 36, exposed through `ANDROID_HOME` or
  `ANDROID_SDK_ROOT`.
- A device or emulator reachable through `adb` to install the result.

Build:

```bash
pnpm build:mobile:staging
```

The script regenerates `apps/mobile/android` with `expo prebuild --clean`
(the native project is CNG output and is not committed), builds the release
variant with Gradle, and copies the APK to:

```text
apps/mobile/dist/staging/aqui-suena-staging.apk
```

A clean build takes roughly 25 to 40 minutes depending on caches; later runs
reuse the Gradle caches.

Install on a connected device or emulator:

```bash
adb install -r apps/mobile/dist/staging/aqui-suena-staging.apk
```

Override an endpoint for a one-off build by passing the variable through:

```bash
EXPO_PUBLIC_STREAM_BASE_URL=https://staging.example.com pnpm build:mobile:staging
```

An `http://` override only works in a debug build; release builds block
cleartext traffic.

Inspect the resolved endpoints and the commands without building:

```bash
node scripts/build-mobile-staging.mjs --dry-run
```

Caveats:

- The release variant signs with the debug keystore, so this APK is for testing
  only and cannot be published. See `odd/tasks/android-native-build.md`.
- `targetSdk 36` blocks cleartext HTTP. Both endpoints must stay on HTTPS; a
  plain-HTTP override only works in a debug build.
- There is no over-the-air update. Every endpoint or JS change needs a new APK.

## EAS Build (cloud)

`apps/mobile/eas.json` defines a `staging` profile: internal distribution, an
Android APK, remote versioning, and an automatically incremented `versionCode`.

EAS CLI is not installed globally. `scripts/eas.mjs` runs it through `pnpm dlx`
with the two lifecycle scripts pnpm 12 blocks by default and pins the working
directory to `apps/mobile`, which is where EAS expects the app in this monorepo.

Persist the alias in your shell. This machine already has it in `~/.bashrc`:

```bash
alias eas='node "/path/to/aqui-suena/scripts/eas.mjs"'
```

Then, from any directory:

```bash
eas login
eas init
eas build --platform android --profile staging
eas build:run --platform android --latest
```

- `eas init` is the one-time project link. It writes `extra.eas.projectId` and
  `owner` into `app.json`; review and commit that edit. This repository already
  has both.
- The free plan has a monthly build quota. Check the current limits before
  relying on it for frequent builds.
- Install the latest build on the emulator with
  `eas build:run --platform android --latest`, or download the APK from the link
  EAS prints.
- Only Android is configured. An iOS internal build would additionally need an
  Apple account and registered devices.

Without the alias, run the wrapper directly:

```bash
node scripts/eas.mjs build --platform android --profile staging
```

The raw command, if you prefer not to use the wrapper (run it from
`apps/mobile`):

```bash
pnpm dlx --allow-build=dtrace-provider --allow-build=protobufjs eas-cli@latest build --platform android --profile staging
```

## Verification

After installing, open the app and press play. The station should reach the
playing state and switch between Test Pop, Test Jingle, and Test Night. If it
fails, check that the Worker `/health` responds and that the Pages
`/test-streams/test-pop.m4a` URL returns `audio/mp4`.
