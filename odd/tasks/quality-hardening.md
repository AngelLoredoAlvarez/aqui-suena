# Quality hardening: TDD, SOLID, Clean Code, structure

Objective: close the gaps found in the full monorepo review across strict TDD
enforcement, SOLID boundaries, Clean Code and directory hygiene. Branch
`chore/quality-hardening`. Delivery: one slice per task, commits deferred until
explicit approval. Test runner: Vitest (per package), `cargo test` (desktop),
Playwright (web e2e).

## Specs

- S1 — Coverage thresholds are enforced in `packages/ui`, `packages/player`,
  `packages/db` and `packages/config`, not only `packages/api`. Each package has
  a `test:coverage` script and thresholds sized a couple of points below its
  measured baseline (same policy as `packages/api`).
- S2 — CI (`quality.yml`) runs the desktop Rust tests and the web Playwright e2e
  suite, so existing tests actually gate merges.
- S3 — Logic-bearing modules without a co-located test gain one: the ads-carousel
  drag hook, the station-sheet escape hook, locale persistence, the station
  state store, the tray bridge, the domain error hierarchy, and the directory
  domain models that only ship an in-memory repository.
- S4 — The in-memory repositories currently co-located inside domain model files
  are either moved to `packages/api/src/testing` or kept with a documented
  contract; the chosen option removes the duplicated state-transition
  invariants risk between the in-memory and D1 adapters.
- S5 — Oversized presentational components that mix state, handlers and layout
  (`ads-carousel`, `native-boot-splash`) are split into cohesive parts without
  behavior change.
- S6 — Directory hygiene: stale `docs/archive` plans are pruned, and `apps/desktop`
  exposes a `test` script so its Rust suite is runnable from the workspace.

## Tasks

- T1 — S1: coverage baselines + thresholds + `test:coverage` in ui, player, db, config. Route: inline. ✅ done
- T2 — S2: `apps/desktop` test script + CI cargo test and Playwright e2e steps. Route: inline. ✅ done
- T3 — S3: test `use-carousel-drag`. Route: inline. ✅ done
- T4 — S3: test the remaining untested logic files. Route: inline. ✅ done
- T5 — S4: in-memory repository placement decision. Route: delegated writer. ✅ done
- T6 — S5: split `ads-carousel` and `native-boot-splash`. Route: inline. ✅ done
- T7 — S6: prune `docs/archive`, confirm desktop test script wiring. Route: inline. ✅ done

## Log

- L1 — Full monorepo review: TDD, SOLID, Clean Code and structure; resolve every
  finding, start with the coverage/CI item, on a new branch, no commits until
  approved. (2026-11-26)
- L2 — T1: coverage thresholds added to ui (86/73/81/86), player (97/93/98/97),
  db (47/95/31/47, declarative schema), config (100). All four pass.
  (2026-11-26)
- L3 — T2: desktop `test:rust` script wired; CI gains `desktop-tests` (cargo
  test, 10 passing) and `e2e` (Playwright) jobs. The web e2e suite was already
  red: 14 failures from an unstubbed `/trpc/ads.carousel` and
  `/trpc/listener.getStatus` proxy 500 (no API server in e2e). Fixed by stubbing
  `/trpc/` in `player.spec.ts`; 20/20 now pass. (2026-11-26)
- L4 — T3+T4: added tests for `use-carousel-drag` (9), `use-escape-to-close`
  (4), `domain-error` (4), `media-attachment` (9). `locale-storage` was already
  covered by `locale.test.tsx` (false positive). `station.ts` and `tray-bridge.ts`
  are data/types only. Directory model files are InMemory fakes — deferred to
  T5. (2026-11-26)
- L5 — T5 evidence: the `InMemory*Repository` classes are not just test doubles —
  they are production fallbacks and seeds (`createInMemoryRepositories`, the
  default plan catalog, the station harness, `InMemoryObjectStorage` in
  `main.ts`). So they cannot be moved to `src/testing/`; the real fork is keep
  them colocated in domain vs relocate them to `infrastructure/memory` as
  adapters. (2026-11-26)
- L6 — T5: chose `infrastructure/memory`. Delegated to a writer; all 17
  `InMemory*` classes relocated to `packages/api/src/infrastructure/memory/`
  (flat, one file per class), domain files reduced to model + port, ~66
  importers rewritten. Verified: 1402 tests pass, typecheck clean, biome 374
  files clean, `arch` no violations. `gentle-ai review assess` returned
  `unassessable` (untracked files — no commits yet), so no native tier was
  produced; actual risk is passive (pure relocation, no behavior change).
  (2026-11-26)
- L7 — T6+T7: light extraction (behavior-preserving): `AdsCarouselPlaceholder`
  and `AdsCarouselDetails` split out of `ads-carousel.tsx`, `FooterMark` out of
  `native-boot-splash.tsx`. `docs/archive/` (6 stale plan/todo files) removed.
  ui typecheck + 50 ads tests, mobile typecheck + 11 tests, biome clean.
  (2026-11-26)
- L8 — Delivery: committed in nine work-unit commits and opened as a single PR
  from `chore/quality-hardening`. (2026-11-26)
