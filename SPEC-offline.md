# Spec: offline — Aquí Suena (by 17Labs)

## Objective

Keep Aquí Suena usable when there is no network: the player shows an offline state instead of crashing, cached data (station list, last status) remains visible, and the app recovers gracefully when connectivity returns. Users: listeners on flaky mobile networks. Success = no crash, no silent failure, and automatic recovery on reconnect.

## Tech Stack

- Web: Service Worker + Cache API (cache static assets + last API responses), `navigator.onLine` + `online`/`offline` events.
- Native: `@react-native-community/netinfo` (free, Expo-compatible) for connectivity state.
- Desktop: Tauri (native network detection via OS APIs).
- Data: TanStack Query with `networkMode: 'offlineFirst'` + persisted cache (`@tanstack/query-async-storage-persister` + AsyncStorage).
- Player: expo-audio handles network failures internally; the app layer adds retry + offline state.
- Language: TypeScript strict
- Lint/format: Biome (replaces ESLint + Prettier)

## Commands

```
Dev web: pnpm --filter web dev
Build: pnpm -r build
Test: pnpm -r test -- --run
Lint: pnpm exec biome check --write .
Typecheck: pnpm -r typecheck
```

## Project Structure

```
packages/ui/src/offline-banner.tsx      → shared offline indicator (Tamagui)
packages/ui/src/use-connectivity.ts     → shared hook (web: navigator.onLine, native: NetInfo)
packages/player/src/use-player.ts       → already handles stream failures; add offline retry
apps/web/public/sw.js                  → service worker (cache static assets + API responses)
apps/web/app/layout.tsx                → register service worker
```

## Offline Behavior

- **Stream fails (no connection)**: player shows `error` status with message "Sin conexión. Reintentando…"; auto-retry every 10s; resume automatically on reconnect.
- **tRPC queries**: TanStack Query with `networkMode: 'offlineFirst'` returns cached data; shows stale-while-revalidate indicator.
- **Station list**: cached in TanStack Query persisted cache; available offline.
- **Images**: cached by Service Worker (Cache API) on web; expo-image cache on native.
- **Audio**: the stream proxy (`/stream`) is not available offline; player retries when back online.

## Code Style

Connectivity hook with platform abstraction:

```ts
// packages/ui/src/use-connectivity.ts
export function useConnectivity(): { isOnline: boolean } {
  // Web: navigator.onLine + online/offline events
  // Native: NetInfo.addEventListener
  // Desktop: Tauri network state
}
```

Conventions: offline state is derived from the connectivity hook + query error; no separate "offline mode" flag; auto-retry with exponential backoff (10s, 30s, 60s max); clear error messages via i18n dictionary (ES "Sin conexión" / EN "No connection").

## Testing Strategy

- Framework: Vitest + Testing Library; Playwright headed with network throttling.
- Locations: `packages/ui/src/offline-banner.test.tsx`, `packages/ui/src/use-connectivity.test.ts`, e2e `apps/web/e2e/offline.spec.ts`.
- Coverage: 100% on connectivity state machine + retry logic.
- Levels: unit (connectivity hook, retry backoff) → integration (query offline cache) → e2e (disconnect → offline banner → reconnect → auto-retry).

## Boundaries

- Always: never crash on network failure, show clear offline state, auto-retry with backoff, cache last-known data, run `typecheck + lint + test` before commit.
- Ask first: add offline download of stations/episodes, add service worker caching strategy changes.
- Never: silently fail (always show state), cache audio streams (too large), block the UI thread, lose the selected station on reconnect.

## Success Criteria

- Disconnect network → player shows "Sin conexión, reintentando…" (ES) / "No connection, retrying…" (EN); no crash.
- Cached station list and status remain visible offline.
- Reconnect → player auto-retries and resumes playback.
- TanStack Query returns cached data offline with stale indicator.
- Images load from cache offline (Service Worker on web).
- Works on web, native (Expo) and desktop (Tauri).

## Open Questions

- Should we cache the audio stream locally for offline playback? (Recommendation: no for V1 — streams are live, not on-demand.)
- Should the offline banner be global or per-component? (Recommendation: global banner at app level.)
- Service Worker caching strategy: stale-while-revalidate for API, cache-first for assets?
