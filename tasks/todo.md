# Todo: radio-playback (MVP)

## Task 1: Monorepo scaffold

**Description:** Create pnpm workspaces with `apps/web` (Next.js App Router + React Native Web), `apps/native` (Expo Router), and `packages/*` with shared TypeScript strict config.

**Acceptance criteria:**
- [x] `pnpm -r build` resolves all workspaces without errors
- [x] `apps/web` renders a placeholder route and `apps/native` boots in Expo Go (verified by user 2026-10-07)
- [x] Shared `@aqui-suena/*` aliases resolve from apps

**Verification:**
- [x] Tests pass: `pnpm -r test -- --run`
- [x] Build succeeds: `pnpm -r build`
- [x] Manual check: open web placeholder and native placeholder (verified by user 2026-10-07)

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `pnpm-workspace.yaml`
- `apps/web/app/page.tsx`
- `apps/native/app/index.tsx`

**Estimated scope:** Medium: 3-5 files

## Task 2: Tamagui + Solito foundation

**Description:** Set up canonical `tamagui.config` (tokens, themes, fonts, media) with providers in both apps, plus shared Solito route constants. Landed via player-landing: the landing `/` renders the shared UI on web and native; no `/player` screens exist.

**Acceptance criteria:**
- [x] Same Tamagui button renders on web and native from shared code
- [x] Landing `/` renders the shared player UI on web and native with no `next/link` in `packages/ui`
- [x] Themes/tokens apply with no web-only CSS leak

**Verification:**
- [x] Tests pass: `pnpm --filter ui test -- --run`
- [x] Build succeeds: `pnpm -r build`
- [x] Manual check: open landing `/` on web and native, same layout (verified by user 2026-10-07/08)

**Dependencies:** Task 1

**Files likely touched:**
- `packages/config/tamagui.config.ts`
- `packages/navigation/routes.ts`
- `packages/ui/src/provider.tsx`

**Estimated scope:** Medium: 3-5 files

## Task 3: DB + tRPC status API

**Description:** Add Drizzle `stations` / `listen_sessions` schema and `listener.getStatus` mock returning `{ station, activeUrl, listeners }` consumed via TanStack Query from the landing `/`. Mock-first: no live Postgres, no HTTP transport yet (both deferred and marked pending).

**Acceptance criteria:**
- [x] `listener.getStatus` returns the mocked shape validated by zod
- [x] Landing `/` reads status via TanStack Query with loading/error states
- [x] `db:push` script exists (live run on a dev database deferred, pending)

**Verification:**
- [x] Tests pass: `pnpm --filter api test -- --run` and `pnpm --filter db test -- --run`
- [x] Build succeeds: `pnpm -r build`
- [x] Manual check: landing shows loading, then station status (verified by user 2026-10-08)

**Dependencies:** Task 1

**Files likely touched:**
- `packages/db/src/schema.ts`
- `packages/api/src/routers/listener.ts`
- `packages/ui/src/player-landing.tsx`

**Estimated scope:** Medium: 4-6 files

## Checkpoint: Foundation
- [x] All tests pass
- [x] Application builds without errors
- [x] Landing `/` + status API work end-to-end
- [x] Review with human before proceeding (approved 2026-10-08)

## Task 4: Player core (fallback + autoplay)

**Description:** Implement `STREAM_FALLBACK_URLS`, `describeMediaError` (incl. `NotAllowedError` → `blocked`, code 4 human message), and `usePlayer({ autoplay: true })` with mount autostart and mirror rotation.

**Acceptance criteria:**
- [ ] Primary 403/timeout auto-switches to next mirror and logs active URL
- [ ] `NotAllowedError` maps to `blocked`, code 4 maps to human message
- [ ] 100% coverage on fallback picker + error mapper

**Verification:**
- [ ] Tests pass: `pnpm --filter player test -- --run`
- [ ] Build succeeds: `pnpm -r typecheck`
- [ ] Manual check: force primary failure, fallback engages

**Dependencies:** Tasks 1-3

**Files likely touched:**
- `packages/player/src/fallback.ts`
- `packages/player/src/errors.ts`
- `packages/player/src/usePlayer.ts`

**Estimated scope:** Medium: 3-5 files

## Task 5: PlayerCard UI (Tamagui + Solito)

**Description:** Build Tamagui `PlayerCard` with status text, `blocked` one-tap resume, and an in-place station selector. No station screens and no router imports in shared code by product decision (player switches stations on the landing); each app would wire navigation with its own router only if route screens ever exist.

**Acceptance criteria:**
- [x] `playing` shows active status, `blocked` shows single resume tap only
- [x] Station selector lists stations, calls `onSelectStation` with the id, hides while blocked
- [x] No raw `div` / web-only CSS in shared UI

**Verification:**
- [x] Tests pass: `pnpm --filter ui test -- --run`
- [x] Build succeeds: `pnpm -r build`
- [x] Manual check: landing + card on web and native, no navigation redbox (verified by user 2026-10-08)

**Dependencies:** Task 4

**Files likely touched:**
- `packages/ui/src/player-card.tsx`
- `packages/ui/src/status-dot.tsx`

**Estimated scope:** Small: 1-2 files

## Task 6: Web autoplay integration

**Description:** Wire autoplay `PlayerCard` into the Next.js landing `/`, attempting audible autoplay on mount with `blocked` resume fallback.

**Acceptance criteria:**
- [x] First visit attempts audible autoplay with no manual play required
- [x] Allowed path is audible in <5s headed; blocked path shows resume tap
- [x] No sustained 403 on primary mirror

**Verification:**
- [x] Tests pass: `pnpm --filter web test -- --run`
- [x] Build succeeds: `pnpm -r build`
- [x] Manual check: fresh headed session autoplays or offers resume (audible on web + native, verified by user 2026-10-08)

**Dependencies:** Tasks 4-5

**Files likely touched:**
- `apps/web/app/page.tsx`
- `apps/web/e2e/player.spec.ts`

**Estimated scope:** Small: 1-2 files

## Task 7: Native autoplay integration

**Description:** Wire autoplay `PlayerCard` into the Expo landing `/` with `expo-audio` plus background-safe playback. Pause/resume works on web and native (hook + card + both drivers); background no-crash is native-specific.

**Acceptance criteria:**
- [ ] App open autoplays audibly in <5s in Expo Go
- [ ] Pause/resume works on web and native, background does not crash (native)
- [ ] Same landing and card as web

**Verification:**
- [ ] Tests pass: `pnpm --filter native test -- --run`
- [ ] Build succeeds: `pnpm --filter native build`
- [ ] Manual check: open app, hear audio without tapping play

**Dependencies:** Tasks 4-5

**Files likely touched:**
- `packages/player/src/use-player.ts` (pause)
- `packages/ui/src/player-card.tsx` (pause button)
- `packages/ui/src/expo-driver.ts` + `expo-driver.native.ts` (pause wiring)

**Estimated scope:** Small: 1-2 files

## Checkpoint: Core Features
- [ ] All tests pass
- [ ] Application builds without errors
- [ ] Autoplay flow works headed web + native
- [ ] Review with human before proceeding

## Task 8: Verification + headed e2e

**Description:** Run full gates and headed audio e2e for autoplay allowed/blocked, fallback, navigation, and Tamagui parity.

**Acceptance criteria:**
- [ ] 80% coverage in `packages/player` verified
- [ ] Headed e2e passes for autoplay, resume, fallback, `/player` routes
- [ ] Tamagui parity web/native confirmed, no CSS leak

**Verification:**
- [ ] Tests pass: `pnpm -r test -- --run`
- [ ] Build succeeds: `pnpm -r build`
- [ ] Manual check: SPEC-radio-playback.md success criteria checklist

**Dependencies:** Tasks 6-7

**Files likely touched:**
- `apps/web/e2e/player.spec.ts`
- `packages/player/src/*.test.ts`

**Estimated scope:** Small: 1-2 files

## Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] Ready for review
