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

**Description:** Set up canonical `tamagui.config` (tokens, themes, fonts, media) with providers in both apps, plus shared Solito route constants and empty `/player` route shells.

**Acceptance criteria:**
- [ ] Same Tamagui button renders on web and native from shared code
- [ ] `/player` resolves on web and native via Solito with no `next/link` in `packages/ui`
- [ ] Themes/tokens apply with no web-only CSS leak

**Verification:**
- [ ] Tests pass: `pnpm --filter ui test -- --run`
- [ ] Build succeeds: `pnpm -r build`
- [ ] Manual check: open `/player` on web and native, same layout

**Dependencies:** Task 1

**Files likely touched:**
- `packages/config/tamagui.config.ts`
- `packages/navigation/routes.ts`
- `packages/ui/src/provider.tsx`

**Estimated scope:** Medium: 3-5 files

## Task 3: DB + tRPC status API

**Description:** Add Drizzle `stations` / `listen_sessions` schema and `listener.getStatus` mock returning `{ station, activeUrl, listeners }` consumed via TanStack Query.

**Acceptance criteria:**
- [ ] `listener.getStatus` returns 200 with mocked shape validated by zod
- [ ] Web player view reads status via TanStack Query with loading/error states
- [ ] `db:push` works on dev database

**Verification:**
- [ ] Tests pass: `pnpm --filter api test -- --run`
- [ ] Build succeeds: `pnpm -r build`
- [ ] Manual check: query status from web player view

**Dependencies:** Task 1

**Files likely touched:**
- `packages/db/src/schema.ts`
- `packages/api/src/routers/listener.ts`
- `apps/web/app/player/page.tsx`

**Estimated scope:** Small: 1-2 files

## Checkpoint: Foundation
- [ ] All tests pass
- [ ] Application builds without errors
- [ ] Placeholder `/player` + status API work end-to-end
- [ ] Review with human before proceeding

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

**Description:** Build Tamagui `PlayerCard` with status text, `blocked` one-tap resume, and Solito deep link to `/player/[stationId]`.

**Acceptance criteria:**
- [ ] `playing` shows active status, `blocked` shows single resume tap only
- [ ] Deep link opens the same card on web and native
- [ ] No raw `div` / web-only CSS in shared UI

**Verification:**
- [ ] Tests pass: `pnpm --filter ui test -- --run`
- [ ] Build succeeds: `pnpm -r build`
- [ ] Manual check: toggle `blocked` state, resume starts same stream

**Dependencies:** Task 4

**Files likely touched:**
- `packages/ui/src/player-card.tsx`
- `packages/ui/src/status-dot.tsx`

**Estimated scope:** Small: 1-2 files

## Task 6: Web autoplay integration

**Description:** Wire autoplay `PlayerCard` into the Next.js landing `/`, attempting audible autoplay on mount with `blocked` resume fallback.

**Acceptance criteria:**
- [ ] First visit attempts audible autoplay with no manual play required
- [ ] Allowed path is audible in <5s headed; blocked path shows resume tap
- [ ] No sustained 403 on primary mirror

**Verification:**
- [ ] Tests pass: `pnpm --filter web test -- --run`
- [ ] Build succeeds: `pnpm -r build`
- [ ] Manual check: fresh headed session autoplays or offers resume

**Dependencies:** Tasks 4-5

**Files likely touched:**
- `apps/web/app/page.tsx`
- `apps/web/e2e/player.spec.ts`

**Estimated scope:** Small: 1-2 files

## Task 7: Native autoplay integration

**Description:** Wire autoplay `PlayerCard` into the Expo landing `/` with `expo-av`, background-safe playback and pause/resume.

**Acceptance criteria:**
- [ ] App open autoplays audibly in <5s in Expo Go
- [ ] Pause/resume works, background does not crash
- [ ] Same landing and card as web

**Verification:**
- [ ] Tests pass: `pnpm --filter native test -- --run`
- [ ] Build succeeds: `pnpm --filter native build`
- [ ] Manual check: open app, hear audio without tapping play

**Dependencies:** Tasks 4-5

**Files likely touched:**
- `apps/native/app/index.tsx`
- `packages/player/src/native.ts`

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
