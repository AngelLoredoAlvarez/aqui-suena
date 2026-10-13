# Feature: free-test-stations — Safe test-stations harness

## Objective
Give the in-place station selector three playable dev channels for testing without legal risk: exactly 3 self-hosted test loops (test-pop, test-jingle, test-night; see Dev channels below) plus optional indie streams used only with prior written permission.

## Why
Local FM streams were removed by user order (2026-10-13): no permissions, lawsuit risk unwanted. Known free-culture options are not usable as in-app embeds without a grant: SomaFM TOS forbids new third-party apps/embeds, Radio Paradise pays royalties with no app redistribution grant, NCS usage is UGC-only (not for streaming apps), Nightride FM is personal non-commercial only. Technical accessibility of a stream URL is not a license. The harness replaces all of that with streams we fully control plus permission-backed exceptions.

## Scope
- In: safe harness per `SPEC-radio-playback.md` (self-hosted synthesized loops, verified playable seed rule, link-out or honest empty state otherwise, proof file kept).
- Out: local FM stations; commercial catalogue embeds without signed permission; aggregator-scraped URLs; invented URLs; proxying, re-serving, caching, or transcoding third-party streams.
- Unchanged: in-place selector mechanism, no station screens, `packages/navigation` stays reserved; autoplay, persistence, dock, fallback behavior.

## Constraints
- Client connects directly to operator URLs only; no proxy/re-serve/cache/transcode.
- Only `streamStatus=verified` AND (CC commercially allowed OR written `permissionStatus=granted`) rows are playable in-app.
- Proof file tracks the harness itself (this doc + SPEC table + generation commands); no license entries needed since all three channels are synthesized and owned by construction. CC-track loops may replace pop/night later, with per-track license URLs recorded then.
- Stable station ids (slug, never frequency-only); `locality=TEST`.
- Docs only in this change; no code changes.

## Dev channels (exactly 3)

| id | Content | URL (dev) | License |
|---|---|---|---|
| test-pop | Upbeat synthesized loop (major arpeggio motif, ffmpeg-only) | /test-streams/test-pop.m4a | Owned (ffmpeg synthesis, no license needed) |
| test-jingle | Synthesized station-ID jingle (three-tone 1-2-3 sine motif, ~2s, no speech) | /test-streams/test-jingle.m4a | Owned (ffmpeg synthesis, no license needed) |
| test-night | Chill synthesized loop (low major motif, ffmpeg-only) | /test-streams/test-night.m4a | Owned (ffmpeg synthesis, no license needed) |

Generation: ffmpeg only using the native AAC encoder (`-c:a aac`) — sine-motif synthesis for all three channels, zero downloads. Exact commands live with the developer, not in this doc. MP3 output is unsupported on minimal ffmpeg builds without libmp3lame (encoder not found), so AAC is required. M4A binaries are gitignored (`public/test-streams/*.m4a`, `.gitkeep` kept) and never committed. No recording, no downloads, and no TTS engine required.
Serving: Next `public/` in dev (`localhost:3000/test-streams/...`, LAN IP for Expo devices); no deployment needed.

## Authorized scope
Docs only: this ODD file + `SPEC-radio-playback.md` updates. No code, no commits, no push, no PRs.

## Checklist
- [x] FS1 SPEC cleaned: every local-only catalog reference removed (names, localities, local scope, local seed rule) — verified: SPEC contains zero Rioverde/Fernandez/Refugio/local-only refs
- [ ] FS2 Harness schema defined in SPEC (id, name, locality=TEST, band, streamUrl, streamStatus, streamSourceUrl, verifiedAt, licenseType, operator, officialSite, permissionStatus, confidence, notes + playable seed rule + explicit forbids + concrete 3-channel table, all owned synth)
- [ ] FS3 Proof-file process defined (harness doc + SPEC table + generation commands; no license entries while all channels are synthesized) + generation approach (ffmpeg only with `-c:a aac`: synth motifs, zero downloads) + .gitignore rule for public/test-streams/*.m4a
- [ ] FS4 Implementation deferred until the harness loops are hosted and proof files exist

## Acceptance criteria
- SPEC objective describes the safe test-stations harness, not a local catalog.
- Selector contract lists harness stations and switches in place; no station screens exist.
- Unverified or permission-pending entries render as link-out; empty harness renders an honest empty message.
- Forbidden sources and proxying are explicitly excluded in SPEC.
- Autoplay, persistence, dock, and fallback expectations unchanged.

## Applicable checks
- Docs-only change: no tests or builds required. Verify with `git status --short` and `git diff --stat`; read back all three files.

## After FS4
Build order by reference: Phase 1 player restyle per `SPEC-radio-playback.md` → Phase 2 Supabase Auth per `SPEC-owner-portal.md` → registration → plans/Conekta → downgrade → directory/spots/stats/feedback → ads-tiers. Designs may change, so each phase re-verifies against the SPECs before coding.
