# Spec: notifications — Aquí Suena (by 17Labs)

## Objective

Push notifications across web, mobile and desktop so listeners hear about new stations, sponsor updates and spot airings without opening the app. Free-tier only: Expo Push Service (free), Web Push API (free, VAPID), Tauri native notifications (free). Users: listeners (receive) and owners (trigger on publish). Success = a listener receives a notification on their device and tapping it opens the relevant screen, audio state preserved.

## Tech Stack

- Web: Web Push API + Service Worker (VAPID keys, free)
- Native: Expo Notifications (free, uses Expo Push Service)
- Desktop: Tauri notification plugin (native OS, free)
- Backend: Cloudflare Worker (free: 100k requests/day) — push dispatch endpoint
- DB: Drizzle + SQLite/D1 (notification_tokens table: userId, platform, token, createdAt)
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
packages/api/src/routers/notifications.ts  → notifications.registerToken / notifications.send (internal)
packages/api/src/push-dispatcher.ts       → platform-aware push sender (Expo Push, Web Push, Tauri)
packages/db/src/schema.ts                 → notification_tokens (userId, platform, token, createdAt)
packages/ui/src/notification-permission.tsx → shared permission request + token registration
apps/web/public/sw.js                     → service worker for Web Push
apps/mobile/app.json                      → Expo Notifications config (already present)
apps/desktop/src-tauri/tauri.conf.json     → Tauri notification plugin config
```

## Free-Tier Limits (hard)

- Expo Push Service: free, unlimited notifications (rate-limited per token).
- Web Push (VAPID): free (browser standard, no provider).
- Tauri notifications: native OS, free.
- Cloudflare Worker: 100k requests/day free (push dispatch endpoint).
- Cloudflare D1: 5GB storage free, 5M reads/day, 100k writes/day (token storage).
- No paid push provider (FCM direct, OneSignal, etc.) without approval.

## Push Flow

1. App requests notification permission (shared `notification-permission` component).
2. On grant, app obtains a push token (Expo Push token / Web Push subscription / Tauri token).
3. App calls `notifications.registerToken` (tRPC, auth required) with token + platform.
4. Server stores token in `notification_tokens` table.
5. When an event triggers (new station, sponsor update, spot airing), server calls `notifications.send` (internal) which dispatches via the platform-aware sender.
6. Tapping the notification opens the relevant screen (deep link or in-app route).

## Platform Details

- **Web**: Service Worker + Push API. Requires HTTPS (prod) or localhost (dev). VAPID keys generated once, stored in env.
- **Mobile (Expo)**: `expo-notifications` handles permission + token. Push via Expo Push Service (free). Works in Expo Go for foreground; background requires dev build.
- **Desktop (Tauri)**: `tauri-plugin-notification` sends native OS notifications. No push service needed (local only).

## Code Style

Token registration with platform detection:

```ts
// packages/api/src/routers/notifications.ts
export const registerToken = publicProcedure
  .input(
    v.object({ token: v.string(), platform: v.picklist(["web", "ios", "android", "desktop"]) }),
  )
  .mutation(({ input, ctx }) => {
    // Store token + userId + platform in DB (upsert on token)
  });
```

Conventions: tokens are upserted (not duplicated) on re-registration; stale tokens cleaned up on 410 Gone; notification payload is small (title + body + deep link); no sensitive data in push payload; audio state preserved on notification tap (no unmount).

## Testing Strategy

- Framework: Vitest + Testing Library; Playwright headed for Web Push.
- Locations: `packages/api/src/push-dispatcher.test.ts`, `packages/ui/src/notification-permission.test.tsx`, e2e `apps/web/e2e/notifications.spec.ts`.
- Coverage: 100% on token upsert + platform dispatch logic.
- Levels: unit (dispatcher routing by platform) → integration (register → send → dispatched) → e2e (permission → token → notification received).

## Boundaries

- Always: request permission only after user action (not on app open), store tokens securely, dispatch via platform-appropriate sender, preserve audio on notification tap, run `typecheck + lint + test` before commit.
- Ask first: add notification categories/channels, enable rich media notifications, add notification scheduling.
- Never: send push without user consent, include sensitive data in payload, use a paid push provider, block audio during notification handling, send marketing without opt-in.

## Success Criteria

- Listener grants permission → token registered → receives a push on their device.
- Tapping a notification opens the relevant screen without stopping audio.
- Web Push works on Chrome/Firefox/Safari (HTTPS or localhost).
- Mobile Push works on iOS/Android via Expo Push (dev build for background).
- Desktop Push works via Tauri native notification.
- Token cleanup handles stale/invalid tokens (410 Gone).
- All free-tier limits respected (no paid provider).

## Open Questions

- Should notifications be opt-in per category (new stations, sponsor updates, spot airings)?
- Web Push requires HTTPS in production — how does this interact with the Cloudflare Pages deploy?
- Should we use Expo Push Service directly or FCM/APNs directly? (Recommendation: Expo Push Service for V1 — free, unified, no native config.)
