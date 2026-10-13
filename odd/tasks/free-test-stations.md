# Feature: free-test-stations — Safe test-stations harness

## Objective
Give the in-place station selector three playable dev channels for testing without legal risk: exactly 3 self-hosted test loops (test-pop, test-talk, test-night; see Dev channels below) plus optional indie streams used only with prior written permission.

## Why
Local FM streams were removed by user order (2026-10-13): no permissions, lawsuit risk unwanted. Known free-culture options are not usable as in-app embeds without a grant: SomaFM TOS forbids new third-party apps/embeds, Radio Paradise pays royalties with no app redistribution grant, NCS usage is UGC-only (not for streaming apps), Nightride FM is personal non-commercial only. Technical accessibility of a stream URL is not a license. The harness replaces all of that with streams we fully control plus permission-backed exceptions.

## Scope
- In: safe harness per `SPEC-radio-playback.md` (self-hosted CC0/CC-BY loops, verified playable seed rule, link-out or honest empty state otherwise, attribution visible, proof file kept).
- Out: local FM stations; commercial catalogue embeds without signed permission; aggregator-scraped URLs; invented URLs; proxying, re-serving, caching, or transcoding third-party streams.
- Unchanged: in-place selector mechanism, no station screens, `packages/navigation` stays reserved; autoplay, persistence, dock, fallback behavior.

## Constraints
- Client connects directly to operator URLs only; no proxy/re-serve/cache/transcode.
- Only `streamStatus=verified` AND (CC commercially allowed OR written `permissionStatus=granted`) rows are playable in-app.
- Proof file per station: terms PDF + capture date, per-track license URLs, permission email where applicable.
- Stable station ids (slug, never frequency-only); `locality=TEST`.
- Docs only in this change; no code changes.

## Dev channels (exactly 3)

| id | Content | URL (dev) | License |
|---|---|---|---|
| test-pop | Upbeat CC0 music loop | /test-streams/test-pop.mp3 | CC0 |
| test-talk | Own voice ID ("Aqui Suena test 1-2-3") | /test-streams/test-talk.mp3 | Owned (recorded by the team) |
| test-night | Chill CC-BY music loop | /test-streams/test-night.mp3 | CC-BY, attribution shown in the UI |

Generation: music loops via ffmpeg loop from a CC0/CC-BY source; voice ID via phone recording. MP3 binaries are gitignored (`public/test-streams/*.mp3`, `.gitkeep` kept) and never committed.
Serving: Next `public/` in dev (`localhost:3000/test-streams/...`, LAN IP for Expo devices); no deployment needed.

## Authorized scope
Docs only: this ODD file + `SPEC-radio-playback.md` updates. No code, no commits, no push, no PRs.

## Checklist
- [x] FS1 SPEC cleaned: every local-only catalog reference removed (names, localities, local scope, local seed rule) — verified: SPEC contains zero Rioverde/Fernandez/Refugio/local-only refs
- [ ] FS2 Harness schema defined in SPEC (id, name, locality=TEST, band, streamUrl, streamStatus, streamSourceUrl, verifiedAt, licenseType, operator, officialSite, permissionStatus, confidence, notes + playable seed rule + explicit forbids + concrete 3-channel table: test-pop CC0, test-talk owned, test-night CC-BY)
- [ ] FS3 Proof-file process defined (terms PDF + date, per-track license URL, permission email) + generation approach (ffmpeg loop + phone-recorded ID) + .gitignore rule for public/test-streams/*.mp3
- [ ] FS4 Implementation deferred until the harness loops are hosted and proof files exist

## Acceptance criteria
- SPEC objective describes the safe test-stations harness, not a local catalog.
- Selector contract lists harness stations and switches in place; no station screens exist.
- Unverified or permission-pending entries render as link-out; empty harness renders an honest empty message.
- Forbidden sources and proxying are explicitly excluded in SPEC.
- Autoplay, persistence, dock, and fallback expectations unchanged.

## Applicable checks
- Docs-only change: no tests or builds required. Verify with `git status --short` and `git diff --stat`; read back all three files.
