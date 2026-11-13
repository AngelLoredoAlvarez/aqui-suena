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
- UI station ids live in `test-channels.ts` (`test-pop`, `test-jingle`,
  `test-night`), while the landing asks for `placeholder-station` from
  `@aqui-suena/config`.
- The player plays hardcoded channel URLs; `activeUrl` from the status is not
  used for playback.

## Decisions required before implementation

- D1 (station catalog): read stations from the existing D1 `stations` table
  (recommended) or keep a typed config constant until production streams exist.
- D2 (listener semantics): provider concurrent listeners (Icecast/AzuraCast
  stats, recommended for the public counter), app sessions from
  `listen_sessions` heartbeats (counts only our app), or hybrid.
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

- T1 (S1, D1, D5): station repository (InMemory + D1) and dev seed; align the
  landing station id.
- T2 (S1, S2): query handler reads the catalog; unknown id answers NOT_FOUND;
  RED → GREEN tests.
- T3 (S3, D2): provider stats adapter with cache, or the session-heartbeat
  implementation, depending on the decision.
- T4 (S4): client fetcher over HTTP with schema validation; remove the client
  mock and its duplicate constant.
- T5 (S3, S6): UI no-data state per D3; hide the counter when unavailable if
  that is the decision.
- T6 (S7): update `SPEC-radio-playback.md` (remove the mock success criterion)
  and close the backlog item.

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
