# Spec: radio-playback (MVP) — Aquí Suena by 17Labs

## Objective
Aquí Suena (developed by 17Labs) plays a temporary open-source stream (placeholder for the future own station) on web and native with autoplay on app open, play/pause, status indication, and basic metadata. The player and audio are persistent: they never disappear or stop regardless of navigation, and the user can dock the player top or bottom. User: a listener who opens the app and hears audio without pressing play on first visit ("listen and discover shops"). Success = audio starts automatically with fallback if a mirror fails or autoplay is blocked.

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
  db/             → Drizzle schema (stations, listen_sessions)
```

Routes (shared via Solito):
```
player/           → /player (web + native, same name)
/player/[stationId] → deep link to a station / listing teaser
```

## Code Style
Functional components, hooks, `kebab-case` for files, `PascalCase` for components. One real snippet beats three paragraphs:

```tsx
// packages/ui/src/player-card.tsx
import { Link } from 'solito/link';
import { Button, Text, YStack } from 'tamagui';
import { usePlayer } from '@aqui-suena/player';

export function PlayerCard({ urls, stationId }: { urls: string[]; stationId: string }) {
  const { status, play, resume } = usePlayer({ urls, autoplay: true }); // ice1 → ice2 → ice3, autostart on mount
  // status: 'idle' | 'loading' | 'playing' | 'blocked' | 'error'
  // 'blocked' = browser autoplay policy rejected audible autoplay; render one-tap resume.
  return (
    <YStack gap="$3" padding="$4">
      <Text>Status: {status}</Text>
      {status === 'blocked' ? <Button onPress={resume}>Tap to enable sound</Button> : null}
      <Button onPress={play}>Play</Button>
      <Link href={`/player/${stationId}`}>
        <Text>Open</Text>
      </Link>
    </YStack>
  );
}
// Always attempt audible autoplay on mount; first visit must not require pressing play. Only the browser-blocked case renders a single resume tap.
```

Conventions: zod-validated inputs in tRPC, media errors mapped via `describeMediaError`, no unjustified `any`. Shared components must use Tamagui primitives + tokens and `solito/link` / `solito/router`, never `next/link`, `next/router`, raw `div`, or `View` with inline web-only CSS inside `packages/ui`.

## Testing Strategy
- Framework: Vitest + Testing Library (web), Jest + Expo test (native), headed Playwright for audio e2e (headless 403s against SomaFM-like hosts).
- Locations: `*.test.ts(x)` next to code, e2e in `apps/web/e2e/player.spec.ts`.
- Coverage: 80% in `packages/player`, 100% in fallback + error mapping.
- Levels: unit (fallback picker, error mapper, autoplay-blocked mapper) → integration (tRPC + Query) → headed e2e (autoplay audible <5s when allowed, one-tap resume when blocked, no sustained 403) → navigation (Solito `/player` resolves on web + native) → visual (Tamagui card renders on web + native with same tokens).

## Boundaries
- Always: attempt audible autoplay on app open / first visit with no manual play required, exercise ice1→ice2→ice3 fallback, render status/error/blocked, run `typecheck + lint + test` before commit, validate inputs with zod, use Tamagui primitives + tokens and Solito `Link`/`useRouter` in shared code with shared route constants.
- Ask first: add a native dependency (expo-av / track-player), change DB schema, add a new permanent stream, upgrade Solito / Expo Router / Tamagui major, add a custom Tamagui theme or font.
- Never: commit secrets/signed URLs, require manual play on first visit, delete failing fallback tests without approval, run audio e2e headless against SomaFM-like hosts, import `next/link` or `next/router` inside `packages/ui`, use raw `div` / RN `View` with web-only CSS inside `packages/ui` bypassing Tamagui tokens.

## Success Criteria
- Web: open `/player` on first visit → audible autoplay attempted on mount, audible in <5s in headed Chrome when allowed, `status=playing`, active URL logged, no manual play required.
- Web blocked: when the browser rejects audible autoplay (`NotAllowedError`), `status=blocked` with a single "Tap to enable sound" resume that starts the same stream; no full play flow required.
- Native (Expo Go): open app → autoplay audible in <5s, pause/resume works, background does not crash.
- Fallback: if the primary mirror returns 403/timeout, it switches to the next one unattended and logs it.
- Human error: `MEDIA_ERR_SRC_NOT_SUPPORTED (code 4)` renders as "Signal unavailable, trying mirror…" not a stacktrace.
- Navigation: `/player` resolves on web and native via Solito, `/player/[stationId]` deep-links to the same card on both.
- Persistence: player shell persists across all routes and sheets; opening a listing, carousel card, or owner link never pauses or unmounts audio. Dock position (`top` | `bottom`) is user-selectable and persisted.
- UI: `PlayerCard` renders with Tamagui on web and native from the same code, themes/tokens apply, no web-only CSS leak.
- tRPC `listener.getStatus` returns 200 with `{ station, activeUrl, listeners }` mock.

## Open Questions
- Which open stream do we use as temporary? (proposal: chain with 2-3 mirrors + local proxy for e2e)
- Live metadata (artist/track) via Icecast JSON or just "Live" label?
- Is `expo-av` background enough for MVP or do we need track-player from day one?
- Solito + Expo Router version pin and Next.js App Router as canonical (Pages Router excluded)?
- Tamagui compiler enabled from day one? Which themes, tokens, and fonts are canonical?
- Autoplay policy: audible-first attempt with `NotAllowedError` → `blocked` resume tap, or muted probe first? iOS silent-switch and Media Engagement Index expectations?
