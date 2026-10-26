# Spec: radio-spots — Aquí Suena (by 17Labs)

## Objective

V1: recorded sponsor spots for Aquí Suena Premium members rotated automatically every 4 songs (backend-tunable). The owner uploads audio; the system schedules and logs plays. Users: owners supply audio; listeners hear it inline. Success = paid spots air reliably and provably.

Future (V2, no design): announcer console with Premium request queue for live mentions.

## Tech Stack

- Web: playback via HTMLAudio queue with spot injection
- Native: `expo-audio` queue with spot injection
- Navigation: n/a (audio-only; management in `/owner/spots`)
- UI: Tamagui (upload + schedule list in owner portal)
- Data: tRPC + TanStack Query (`spots.upload`, `spots.schedule`, `spots.plays`)
- DB: Drizzle + SQLite/D1 (`spots`, `spot_plays`)
- Storage: Cloudflare R2 for spot audio (max 30s MP3, loudness normalized at upload — see SPEC-media-storage)
- Language: TypeScript strict
- Lint/format: Biome (replaces ESLint + Prettier)

## Commands

```
Dev web: pnpm --filter web dev
Dev mobile: pnpm --filter mobile start
Build: pnpm -r build
Test: pnpm -r test -- --run
Lint: pnpm exec biome check --write .
Typecheck: pnpm -r typecheck
DB push (dev): pnpm --filter @aqui-suena/db db:push
```

## Project Structure

```
packages/api/src/routers/spots.ts     → upload / schedule / plays (+ reactive takedown)
packages/player/src/spot-queue.ts     → every-X-songs injection + play logging
apps/web/app/owner/spots/page.tsx     → owner spot management
```

## Code Style

Scheduling as pure, testable policy:

```tsx
// packages/player/src/spot-queue.ts
export function nextSpot(opts: { songsSinceSpot: number; every: number; eligible: string[] }) {
  if (opts.songsSinceSpot < opts.every || opts.eligible.length === 0) return null;
  return opts.eligible[opts.songsSinceSpot % opts.eligible.length];
}
```

Conventions: only `spotEligible` (Premium) spots schedule; every play logs `{ spotId, at, platform }`; loudness normalized at upload.

## Testing Strategy

- Framework: Vitest for queue/schedule; headed playback test for injection.
- Locations: `packages/player/src/spot-queue.test.ts`, e2e `apps/web/e2e/spots.spec.ts`.
- Coverage: 100% on `nextSpot` + eligibility filter.
- Levels: unit (rotation, eligibility) → integration (upload→air→logged) → headed (spot airs inline without killing the stream).

## Boundaries

- Always: gate by Premium eligibility, log every airing, cap spots at 30s MP3 (upload-only, auto-approved with reactive takedowns on reports), normalize loudness, run `typecheck + lint + test` before commit.
- Ask first: change rotation cadence, auto-produce spots with TTS.
- Never: air free-tier spots, interrupt a spot with fallback switching mid-play, lose a play log.

## Success Criteria

- Eligible spot airs every 4 songs (±1, backend-tunable) on web and native from the same queue.
- Each airing creates a `spot_plays` row queryable by the owner.
- Ineligible uploads are rejected with typed `UPGRADE_REQUIRED`.
- Spot handoff never stops the underlying stream session.

## Open Questions

- V2 announcer-console design (Premium request queue)?
