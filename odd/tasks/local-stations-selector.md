# Feature: local-stations-selector — Local-only station catalog

> SUPERSEDED — 2026-10-13. Reason: no permissions for local FM streams, lawsuit risk unwanted; removed by direct user order (2026-10-13). Replaced by `odd/tasks/free-test-stations.md` (safe test-stations harness). History below is preserved unchanged; all LS items are cancelled.

## Objective
Scope the player station selector to local radio stations only. The selector mechanism is unchanged (in-place chips in `PlayerCard`); only the catalog scope changes: local stations from Rioverde, Cd. Fernandez, El Refugio and nearby localities.

## Problem
`SPEC-radio-playback.md` frames the stream as a temporary open-source placeholder for a future own station, with a generic `stations` list. That framing no longer matches the product decision: the catalog is local stations, not a placeholder stream and not national/foreign streams.

## Why
Product decision (Engram id 157): the selector lists ONLY local stations. Mechanism unchanged — in-place switching, no station screens.

## Scope
- In scope: local stations from Rioverde, Cd. Fernandez, El Refugio and nearby localities.
- Explicitly out: national streams, foreign streams, open-source placeholder streams as catalog entries.
- Unchanged: in-place selector mechanism (visible in playing/paused/error, hidden while blocked/loading), no station screens, `packages/navigation` stays reserved.

## Constraints
- In-place selector only; no station screens, no router imports in shared code.
- No invented station names, frequencies, or stream URLs. Real catalog entries are TBD pending the user-provided list.
- Catalog structure only: `stations` seed shape is `(id, name, locality, streamUrl TBD)`; `StationRef` gains `locality`.
- Docs only in this change; no code changes.

## Authorized scope
Docs only: this ODD file + `SPEC-radio-playback.md` updates. No code, no commits, no push, no PRs.

## Tasks
- [x] LS1 ~~SPEC updated (objective, DB line, StationRef snippet, success criteria, open questions)~~ — CANCELLED (superseded 2026-10-13: local-stations scope removed, no permissions)
- [x] LS2 ~~Catalog schema shape defined as TBD (id, name, locality, streamUrl), entries pending user list~~ — CANCELLED (superseded 2026-10-13: replaced by safe harness schema in SPEC)
- [x] LS3 ~~Implementation prompt snippet ready for the future build slice~~ — CANCELLED (superseded 2026-10-13)
- [x] LS4 ~~Implementation deferred until the user provides the real station list~~ — CANCELLED (superseded 2026-10-13: local list will not be requested)

Claude prompt snippet (for LS3/LS4): "Implement the local-only station catalog per SPEC-radio-playback.md and odd/tasks/local-stations-selector.md: seed `stations` with the user-provided local list (id, name, locality, streamUrl), extend `StationRef` with `locality`, keep in-place switching with no station screens, render an honest empty message when the catalog is empty. Do not invent station names or URLs."

## Acceptance criteria
- SPEC objective describes the local-stations catalog scope, not a temporary placeholder stream.
- Selector contract lists local stations only and switches in place; no station screens exist.
- Empty catalog renders an honest empty message (no fake entries, no invented URLs).
- Autoplay, persistence, dock, and fallback expectations unchanged.

## Applicable checks
- Docs-only change: no tests or builds required. Verify with `git status --short` and `git diff --stat`; read back both files.
