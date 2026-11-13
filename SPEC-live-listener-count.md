# Spec: live-listener-count — Aquí Suena (by 17Labs)

## Objective

Replace the simulated listener count (`FAKE_LISTENERS`) with a real count of
**concurrent app listeners per station**, without third-party radio stations.
The number measures people using Aquí Suena and playing the audio; it is not the
audience of an external stream, which cannot be measured without a provider.

Users: listeners on web, mobile and desktop. Success = the landing shows a count
that goes up when a real client starts playing and down when it stops, with no
fabricated sessions.

## Contract

### `listener.heartbeat` (new, public mutation)

Input:

```ts
{ stationId: string /* min 1 */, sessionId: string /* UUID v4 */ }
```

Output:

```ts
{
  accepted: true;
}
```

- The station must exist and be visible; otherwise `NOT_FOUND`.
- The server writes `listeners: 1`; it never accepts a client-provided count.
- Idempotent: repeating the same `sessionId` refreshes the same row.

### `listener.getStatus` (unchanged shape)

```ts
{ station: { id, name }, activeUrl, listeners }
```

`listeners` is now the sum of active sessions in the window (see below). The
response shape does not change, so clients need no contract migration.

## Session lifecycle

- The client generates one UUID per player instance with `crypto.randomUUID()`.
  It lives in memory only: a reload starts a new session and the old one expires.
- Send a heartbeat immediately when playback reaches `playing`, then every 30 s
  while it stays `playing`.
- Do not send heartbeats while `loading`, `paused`, `blocked` or `error`.
- Stop on pause, error or unmount. No explicit `end` call in v1; expiry covers it.
- Switching stations reuses the same `sessionId` and updates its `station_id`, so
  a listener moving between stations counts once, on the new station.
- A session is active while its last heartbeat is inside a **60 s window**. With
  a 30 s interval, one missed beat is tolerated.

## Data model

Reuses `listen_sessions`; no migration.

- `id = "live:<sessionId>"`.
- `station_id`, `started_at = last heartbeat`, `ended_at = null`, `listeners = 1`.
- Count query (already implemented):

  ```sql
  SELECT COALESCE(SUM(listeners), 0)
  FROM listen_sessions
  WHERE station_id = ? AND ended_at IS NULL AND started_at > ?
  ```

  with `? = now - 60s`.
- Cleanup: remove rows older than 24 h (or `ended_at` not null) by a scheduled
  Worker cron or an admin endpoint. The demo can start with an admin purge.

## Server behavior

- Validate `stationId` against the station catalog and `sessionId` against a UUID
  pattern before writing.
- One D1 upsert per heartbeat. At 30 s per listener this is acceptable for the
  demo; a larger audience would need Durable Objects or KV, which is out of scope.
- Anti-abuse:
  - Cloudflare rate limit per IP, roughly 6 heartbeats/minute (the client sends 2).
  - Cap distinct sessions per IP and station (for example 20) so one client cannot
    inflate the count without effort. Real listeners are never capped by this.
  - No IP, user agent, account or device identifier is stored. Only the anonymous
    UUID, station and timestamps.
- Heartbeat failures are non-fatal: audio must keep playing and the count may
  under-report until the next beat.

## Client behavior

- A shared hook in the player (web, mobile, desktop) owns the session id and the
  interval. It reacts to the player status, not to component renders.
- It fires immediately on `playing` so the first count appears without waiting
  30 s.
- It must not block playback or surface errors; failures are silent.
- The listener-status query keeps its 30 s refetch, so the displayed number
  follows the server.

## Rollout

1. Deploy the server mutation and client hook.
2. Deploy web, then rebuild mobile (EAS) and desktop if applicable.
3. Set `FAKE_LISTENERS` off in staging.
4. Verify with one device: count `1`; with two: `2`; pause one: back to `1`
   within 60 s.
5. Run the cleanup once and confirm old rows disappear.

## Open decisions

- TTL 60 s vs 90 s (recommended: 60 s).
- Heartbeat interval 30 s vs 45 s (recommended: 30 s).
- Count semantics: concurrent app sessions (recommended) vs weighted sessions.
- Cleanup: scheduled cron vs admin endpoint for v1 (recommended: admin endpoint
  now, cron when the demo is stable).
- Whether to keep `FAKE_LISTENERS` as a local-only visual aid (recommended: keep
  the flag, off in staging and production-like environments).

## Tasks

- T1: `listener.heartbeat` mutation, validation, station guard and upsert, with
  RED → GREEN tests.
- T2: rate limiting and per-IP/session cap.
- T3: shared client heartbeat hook wired to playback status, with tests.
- T4: turn off `FAKE_LISTENERS` in staging and verify the real count end to end.
- T5: cleanup path for expired sessions.
- T6: update `SPEC-radio-playback.md`, the listener feature doc and the backlog.

## Out of scope

- External radio audience or provider statistics.
- WebSocket presence, Durable Objects, historical analytics or per-track counts.
- Counting listeners who play the audio outside the app.
- Authentication for listeners.

## Success criteria

- Opening the app and playing shows `1` for that station without any fake session.
- Two independent clients show `2`; pausing one drops the count to `1` within 60 s.
- Switching stations moves the same session; no double counting.
- A malicious client cannot set an arbitrary count; it can only create sessions,
  bounded by rate limits.
- The player never stops or errors because a heartbeat failed.
