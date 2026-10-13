# Spec: radio-playback (MVP) — Aquí Suena by 17Labs

## Objective
Aquí Suena (developed by 17Labs) plays a safe test-stations harness on web and native with autoplay on app open, play/pause, status indication, and basic metadata. The harness is exactly 3 self-hosted dev channels (test-pop, test-talk, test-night; see Dev channels below) plus optional indie streams used only with prior written permission. The client connects directly to operator URLs: no proxying, re-serving, caching, or transcoding. Attribution is visible in the UI, and a proof file is kept per station (terms PDF + capture date, per-track license URLs, permission email where applicable). User: a listener who opens the app and hears audio without pressing play on first visit ("listen and discover shops"). Success = audio starts automatically with fallback if a mirror fails or autoplay is blocked.

## Tech Stack
- Web: React + Next.js (App Router) + React Native Web (shared components)
- Native: React Native + Expo (managed)
- Navigation: Solito (unified navigation across Next.js + Expo + React Native Web)
- UI: Tamagui (universal components, styling, tokens + themes for Next.js + Expo + React Native Web)
- Data: tRPC + TanStack Query (server state, cache, retry)
- DB: Drizzle + PostgreSQL (metadata / listen sessions only in this module, no audio)
- Language: TypeScript strict
- Lint/format: Biome (replaces ESLint + Prettier)

## Commands
```
Dev web: pnpm --filter web dev
Dev native: pnpm --filter native start
Build: pnpm -r build
Test: pnpm -r test -- --run
Lint: pnpm exec biome check --write .
Typecheck: pnpm -r typecheck
DB push (dev): pnpm --filter db db:push
```

## Project Structure
```
apps/
  web/            → Next.js App Router (routes, player view)
  native/         → Expo Router (player view, same route names as web)
packages/
  player/         → shared playback logic (STREAM_FALLBACK_URLS, describeMediaError, usePlayer hook)
  ui/             → Tamagui-based PlayerCard, PlayButton, StatusDot (RN Web compatible, Solito Link only, tokens + themes)
  config/         → tamagui.config (tokens, themes, fonts, media)
  navigation/     → Solito helpers (createParam, shared route constants)
  api/            → tRPC routers (e.g. listener.getStatus)
  db/             → Drizzle schema (test-stations harness catalog + listen_sessions; see catalog table below, no audio stored)
```

Routes:
```
/ (landing) → player + ads carousel on web and native, from shared code.
/player/*   → does not exist by product decision: the player switches
               stations in place, never by navigating to station screens.
```

## Catalog (safe test-stations harness)

`stations` rows carry:

```
id               → stable slug, never frequency-only
name             → display name of the virtual test station
locality         → always TEST
band             → test harness band label (e.g. TEST)
streamUrl        → operator URL, nullable
streamStatus     → verified | unverified | not_found
streamSourceUrl  → primary page where the URL was observed
verifiedAt       → timestamp of that observation (only when observed on the primary page)
licenseType      → CC0 | CC-BY | CC-BY-SA | written-permission
operator         → stream operator
officialSite     → operator official site
permissionStatus → pending | granted | link-only
confidence       → verification confidence
notes            → free-form notes
```

Seed rule: only rows with `streamStatus=verified` AND (`licenseType` commercially allowed for app streaming OR `permissionStatus=granted` with written proof) are playable in-app. Everything else renders as a link-out or an honest empty state. Proof file per station: terms PDF + capture date, per-track license URLs, permission email where applicable.

Explicitly forbidden: embedding SomaFM, Radio Paradise, NCS, Nightride, or any commercial catalogue without signed written permission; aggregator-scraped URLs; invented URLs. Technical accessibility of a stream URL is not a license. Proxying, re-serving, caching, or transcoding third-party streams is forbidden. Link-out is the lowest-risk fallback.

### Dev channels (exactly 3)

| id | Content | URL (dev) | License |
|---|---|---|---|
| test-pop | Upbeat CC0 music loop | /test-streams/test-pop.mp3 | CC0 |
| test-talk | Own voice ID ("Aqui Suena test 1-2-3") | /test-streams/test-talk.mp3 | Owned (recorded by the team) |
| test-night | Chill CC-BY music loop | /test-streams/test-night.mp3 | CC-BY, attribution shown in the UI |

Binary state: the MP3 files are planned but gitignored — generated locally (ffmpeg loop for music, phone recording for the voice ID) and never committed. Only the generation approach and this table are versioned.
Serving: dev serves the files from Next `public/` (`apps/web/public/test-streams/`), reachable at `http://localhost:3000/test-streams/<file>.mp3` on desktop and via the machine LAN IP from Expo devices. No deployment is needed in dev.
Prod rule unchanged: production plays only real stations with prior written permission; this 3-channel harness is throwaway dev tooling and never ships to prod.

## Code Style
Functional components, hooks, `kebab-case` for files, `PascalCase` for components. One real snippet beats three paragraphs:

```tsx
// packages/ui/src/player-card.tsx
import { Button, Text, YStack } from 'tamagui';
import { usePlayer } from '@aqui-suena/player';

export function PlayerCard({ urls, stations, onSelectStation }: {
  urls: string[];
  stations: { id: string; name: string; locality: string }[];
  onSelectStation: (stationId: string) => void;
}) {
  // Catalog is a safe test harness only: self-hosted CC0/CC-BY loops
  // plus written-permission indie streams. Never invent stream URLs,
  // never scrape aggregators, never embed third-party catalogues
  // (SomaFM, Radio Paradise, NCS, Nightride) without signed permission.
  const { status, play, resume } = usePlayer({ urls, autoplay: true }); // ice1 → ice2 → ice3, autostart on mount
  // status: 'idle' | 'loading' | 'playing' | 'blocked' | 'error'
  // 'blocked' = browser autoplay policy rejected audible autoplay; render one-tap resume.
  return (
    <YStack gap="$3" padding="$4">
      <Text>Status: {status}</Text>
      {status === 'blocked' ? <Button onPress={resume}>Tap to enable sound</Button> : null}
      <Button onPress={play}>Play</Button>
      {stations.map((station) => (
        <Button key={station.id} onPress={() => onSelectStation(station.id)}>
          {station.name}
        </Button>
      ))}
    </YStack>
  );
}
// Station switching happens in place via the selector; there are no station
// screens and no router imports in shared code by product decision.
// Always attempt audible autoplay on mount; first visit must not require pressing play. Only the browser-blocked case renders a single resume tap.
```

Conventions: zod-validated inputs in tRPC, media errors mapped via `describeMediaError`, no unjustified `any`. Shared components must use Tamagui primitives + tokens and `solito/link` / `solito/router`, never `next/link`, `next/router`, raw `div`, or `View` with inline web-only CSS inside `packages/ui`.

## Testing Strategy
- Framework: Vitest + Testing Library (web), Jest + Expo test (native), headed Playwright for audio e2e (headless hosts often return 403).
- Locations: `*.test.ts(x)` next to code, e2e in `apps/web/e2e/player.spec.ts`.
- Coverage: 80% in `packages/player`, 100% in fallback + error mapping.
- Levels: unit (fallback picker, error mapper, autoplay-blocked mapper) → integration (tRPC + Query) → headed e2e (autoplay audible <5s when allowed, one-tap resume when blocked, no sustained 403) → navigation (landing `/` renders the shared player on web + native) → visual (Tamagui card renders on web + native with same tokens).

## Boundaries
- Always: attempt audible autoplay on app open / first visit with no manual play required, exercise ice1→ice2→ice3 fallback, render status/error/blocked, run `typecheck + lint + test` before commit, validate inputs with zod, use Tamagui primitives + tokens in shared code, keep router imports out of shared code (apps wire navigation with their own routers).
- Ask first: add a native dependency (expo-audio / track-player), change DB schema, add a new permanent stream, upgrade Solito / Expo Router / Tamagui major, add a custom Tamagui theme or font.
- Never: commit secrets/signed URLs, require manual play on first visit, delete failing fallback tests without approval, run audio e2e headless against third-party stream hosts, import `next/link` or `next/router` inside `packages/ui`, use raw `div` / RN `View` with web-only CSS inside `packages/ui` bypassing Tamagui tokens, embed SomaFM / Radio Paradise / NCS / Nightride or any commercial catalogue without signed written permission, use aggregator-scraped URLs, invent stream URLs, proxy/re-serve/cache/transcode third-party streams.

## Success Criteria
- Web: open `/` (landing) on first visit → audible autoplay attempted on mount, audible in <5s in headed Chrome when allowed, `status=playing`, active URL logged, no manual play required; pause/resume works.
- Web blocked: when the browser rejects audible autoplay (`NotAllowedError`), `status=blocked` with a single "Tap to enable sound" resume that starts the same stream; no full play flow required.
- Native (Expo Go): open app → autoplay audible in <5s, pause/resume works, background does not crash.
- Fallback: if the primary mirror returns 403/timeout, it switches to the next one unattended and logs it.
- Human error: `MEDIA_ERR_SRC_NOT_SUPPORTED (code 4)` renders as "Signal unavailable, trying mirror…" not a stacktrace.
- Navigation: landing `/` renders the shared player on web and native; the selector lists test-harness stations only and switching happens in place via the card selector, never via station screens.
- Empty catalog: with no verified playable stations the selector renders an honest empty message (no fake entries, no invented URLs); unverified or permission-pending entries render as link-out.
- Persistence: player shell persists across all routes and sheets; opening a listing, carousel card, or owner link never pauses or unmounts audio. Dock position (`top` | `bottom`) is user-selectable and persisted.
- UI: `PlayerCard` renders with Tamagui on web and native from the same code, themes/tokens apply, no web-only CSS leak.
- tRPC `listener.getStatus` returns 200 with `{ station, activeUrl, listeners }` mock.

## Open Questions
- Which CC0 loop source seeds test-pop and which CC-BY track (with attribution text) seeds test-night? (need per-track license URLs; proof files pending)
- Which indie operators, if any, grant written permission for in-app test streams? (link-out is the default until `permissionStatus=granted`)
- Live metadata per test station (artist/track via Icecast JSON or just "Live" label)?
- Fallback order across harness stations (per-station mirrors first, then next station, or fixed global order)?
- Is `expo-audio` background enough for MVP or do we need track-player from day one?
- Solito + Expo Router version pin and Next.js App Router as canonical (Pages Router excluded)?
- Tamagui compiler enabled from day one? Which themes, tokens, and fonts are canonical?
- Autoplay policy: audible-first attempt with `NotAllowedError` → `blocked` resume tap, or muted probe first? iOS silent-switch and Media Engagement Index expectations?
