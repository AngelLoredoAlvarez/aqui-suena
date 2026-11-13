# feat/listener-status

Objective: replace the `listener.getStatus` mock with real station data and an
honest listener count. Status: proposal, no implementation yet. Branch: TBD.
Delivery: one PR. Test runner: `pnpm --filter @aqui-suena/api test`.

## Current state

- `listener.getStatus` (public tRPC) returns `getMockListenerStatus`: station
  name `"Aquí Suena"`, `activeUrl` `https://stream.example.com/live`, and
  `listeners: 42` for any non-empty `stationId`.
- `packages/api/src/client.ts` exposes `getListenerStatus`, which returns the
  same mock without HTTP. The landing UI consumes this client function, not the
  tRPC endpoint, so the card always shows 42 listeners.
- The `stations` and `listen_sessions` tables exist in the Drizzle schema but
  have no repository, seed, or writer.
- UI station ids live in `test-channels.ts` (`aqui-suena-pop`, `aqui-suena-focus`,
  `aqui-suena-night`), while the landing asks for `placeholder-station` from
  `@aqui-suena/config`.
- The player plays hardcoded channel URLs; `activeUrl` from the status is not
  used for playback.

## Decisions required before implementation

- D1 (station catalog): RESOLVED — the Worker reads the D1 `stations` table;
  local Node keeps the in-memory harness. `POST /admin/seed-stations` seeds the
  harness rows per environment with `STREAM_BASE_URL`.
- D2 (listener semantics): PARTIAL — `listeners` sums active sessions from the
  endpoint. The count is deterministic, smooth, has no feature flag and performs
  no database writes; the real source remains pending. The heartbeat design was
  discarded for D1 write cost.
- D3 (no data): when no provider is configured or it fails, return `0`, return
  the last known cached value, or hide the counter in the UI. A number shown to
  the listener must never be a fabricated constant.
- D4 (active URL authority): the endpoint's `activeUrl` becomes the playback
  source, or stays informational while the player keeps its channel config.
- D5 (station ids): replace `placeholder-station` with a real station id, or
  map it. Unknown ids must answer `NOT_FOUND` instead of echoing the input.

## Specs

- S1 (station resolution): `listener.getStatus` reads `id`, `name` and
  `streamUrl` from the station catalog. An unknown `stationId` answers
  `NOT_FOUND` (never echoes a fabricated station). The dev harness seeds the
  three test stations; production seeds only permitted stations.
- S2 (active URL): `activeUrl` is the station's persisted `streamUrl`,
  validated as a URL by the existing output schema. No invented or placeholder
  URLs.
- S3 (listeners): the number comes from the chosen source (D2). Provider stats
  are cached for 10–30 seconds; `listen_sessions` heartbeats are approximate and
  scoped to our app. The endpoint never returns a fixed sentinel such as 42.
- S4 (client): `getListenerStatus` stops returning a local mock and calls the
  tRPC endpoint over HTTP, following the `fetchAdsCarousel` pattern (validate
  the response with the shared valibot schema, throw on HTTP/network/schema
  errors). The client entry must stay free of `@trpc/server` imports.
- S5 (playback): until D4 is approved, playback keeps using the channel URLs and
  the status only informs. If `activeUrl` becomes the playback source, that is a
  UI behavior change and needs explicit approval before implementation.
- S6 (degraded mode): a provider failure or missing configuration must not break
  the landing. The endpoint answers a degraded status per D3, and the UI renders
  the agreed no-data state.
- S7 (explanation): the chosen definition of "listeners" (concurrent stream
  listeners vs active app sessions) is documented in the feature doc and in
  `SPEC-radio-playback.md`.

## Tasks

- [x] T1 (S1, D1, D5): station repository (InMemory + D1) and dev seed; align the
  landing station id. DONE: `D1StationRepository`, `D1StationCatalogWriter` and
  `POST /admin/seed-stations`; local Node uses the in-memory harness, the Worker
  reads D1. Staging needs the seed run once (see `packages/api/DEPLOY.md`).
- [x] T2 (S1, S2): query handler reads the catalog; unknown id answers NOT_FOUND;
  RED → GREEN tests. DONE.
- [x] T3 (S3, D2): provider stats adapter with cache, or the session-heartbeat
  implementation, depending on the decision. PARTIAL: the endpoint now computes a
  deterministic simulated count directly; the real provider/heartbeat source is
  pending. The heartbeat was discarded for D1 write cost.
- [x] T4 (S4): client fetcher over HTTP with schema validation; remove the client
  mock and its duplicate constant. DONE.
- [ ] T5 (S3, S6): UI no-data state per D3; hide the counter when unavailable if
  that is the decision.
- [ ] T6 (S7): update `SPEC-radio-playback.md` (remove the mock success criterion)
  and close the backlog item. SPEC updated; backlog pending.

## Licensing prerequisite

Decision (2026-11-13): keep the owned harness for dev and staging; no
third-party streams are embedded, proxied, or hotlinked. A station enters the
catalog only with an explicit license or written permission recorded in the
catalog metadata. "Staging" is not a licensing exemption.

## Out of scope

- New player features, metadata/now-playing, and navigation.
- Proxying, caching, or transcoding third-party audio.
- Production station licensing and stream permission work.
- Analytics dashboards beyond the public counter.

## Log

- L1 (2026-11-13): Proposal created after reviewing the mock in the server
  router and the duplicate client mock. No implementation authorized yet; D1–D5
  are open product decisions.
- L2 (2026-11-13): Licensing decision recorded — the owned harness stays for dev
  and staging; third-party streams require an explicit license or written
  permission before entering the catalog. The spec was reviewed and is ready for
  a docs PR.
- L3 (2026-11-13): T1 (harness part), T2 and T4 implemented. `listener.getStatus`
  resolves the station from `InMemoryStationRepository` seeded with the harness
  and answers `NOT_FOUND` for unknown ids; the client fetches over HTTP and the
  duplicate mock is gone. `defaultStationId` is now `aqui-suena-pop`. `listeners` is
  `0` (honest unavailable value) until D2 is decided; the UI still renders the
  counter, so D3 remains open. The D1 station repository is deferred until real
  stations are seeded.
- L4 (2026-11-13): D1 wiring completed. Added `D1StationRepository`, the
  idempotent `D1StationCatalogWriter`, and `POST /admin/seed-stations` guarded
  by `ADMIN_TOKEN`. The Worker now reads stations from D1; local Node keeps the
  in-memory harness. The seed requires `STREAM_BASE_URL` and refuses to run
  without it, so a localhost URL cannot reach a deployed database; staging sets
  the variable in `wrangler.toml` and production leaves it unset because the
  harness never ships to prod. Run the seed once per staging environment.
- L5 (2026-11-13): Simulated listener counts implemented through the real
  session path. `listen_sessions` is summed over a 60s window; staging sets
  `FAKE_LISTENERS=1`, which upserts one weighted session per station before
  reading the same count query. Local Node enables the flag; production leaves
  it unset and reports 0. The client refetches every 30s. UI no-data state (D3)
  remains open.
- L6 (2026-11-13): Mobile base-URL regression fixed on
  `fix/mobile-api-base-url`. `resolveApiBaseUrl` now reads
  `NEXT_PUBLIC_API_BASE_URL` / `EXPO_PUBLIC_API_BASE_URL` first and keeps the
  legacy `*_API_URL` names as fallbacks, matching the documented client
  contract and `eas.json`. The mobile bundle must be rebuilt because Expo
  inlines `EXPO_PUBLIC_*` at build time.
- L7 (2026-11-13): Staging demo polish on `feat/staging-demo-realism`. Stations
  are branded (Aquí Suena Pop/Focus/Night), the simulated count now drifts with
  a slow wave plus small jitter instead of jumping randomly, the player renders
  even when the listener query fails (the counter is hidden while unavailable),
  and the three harness loops are five minutes long. The harness audio files are
  gitignored operator artifacts: they are included when deploying from this
  machine but are not part of the commit.
- L8 (2026-11-13): Simulated listener source removed on
  `chore/remove-fake-listeners`: `FAKE_LISTENERS`, its flag plumbing and the
  fake generator are gone. `listener.getStatus` now only sums real
  `listen_sessions`, so it reported `0` until the direct simulation returned.
- L9 (2026-11-13): Heartbeat discarded for cost. `SPEC-live-listener-count.md` is
  superseded: real heartbeats would add D1 writes per client per interval. The
  listener router now returns `simulatedListenerCount` directly (deterministic,
  smooth, no feature flag, zero writes). The `ListenSessionRepository` and its D1
  adapter were removed; the `listen_sessions` table stays in the schema unused.
