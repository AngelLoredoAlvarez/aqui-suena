# Spec: radio-spots — Aquí Suena (by 17Labs)

## Objective
V1: recorded sponsor spots for Aquí Suena Monthly members rotated automatically every X songs. The owner uploads audio; the system schedules and logs plays. Users: owners supply audio; listeners hear it inline. Success = paid spots air reliably and provably.

Future (V2, no design): live announcer mentions.

## Tech Stack
- Web: playback via HTMLAudio queue with spot injection
- Native: `expo-audio` queue with spot injection
- Navigation: n/a (audio-only; management in `/owner/spots`)
- UI: Tamagui (upload + schedule list in owner portal)
- Data: tRPC + TanStack Query (`spots.upload`, `spots.schedule`, `spots.plays`)
- DB: Drizzle + PostgreSQL (`spots`, `spot_plays`)
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
packages/api/src/routers/spots.ts     → upload / approve / schedule / plays
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

Conventions: only `spotEligible` (Monthly) spots schedule; every play logs `{ spotId, at, platform }`; loudness normalized at upload.

## Testing Strategy
- Framework: Vitest for queue/schedule; headed playback test for injection.
- Locations: `packages/player/src/spot-queue.test.ts`, e2e `apps/web/e2e/spots.spec.ts`.
- Coverage: 100% on `nextSpot` + eligibility filter.
- Levels: unit (rotation, eligibility) → integration (upload→approve→air→logged) → headed (spot airs inline without killing the stream).

## Boundaries
- Always: gate by Monthly eligibility, log every airing, cap spot length (e.g. 30s), normalize loudness, run `typecheck + lint + test` before commit.
- Ask first: change rotation cadence, auto-produce spots with TTS.
- Never: air free-tier spots, interrupt a spot with fallback switching mid-play, lose a play log.

## Success Criteria
- Eligible spot airs every X songs (±1) on web and native from the same queue.
- Each airing creates a `spot_plays` row queryable by the owner.
- Ineligible uploads are rejected with typed `UPGRADE_REQUIRED`.
- Spot handoff never stops the underlying stream session.

## Open Questions
- X (songs per spot) default and per-plan override?
- Max spot seconds and upload formats?
- Who approves content (auto vs manual review)?
