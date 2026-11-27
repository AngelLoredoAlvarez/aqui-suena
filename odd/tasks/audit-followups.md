# Audit follow-ups: TDD/SOLID/Clean Code points 1–5

Objective: apply audit points 1–5, re-verifying each before acting so already-done work is not redone. Branch `chore/audit-followups`. Test runner: `vitest run` per package.

## Specs

- S1: The station-sheet backdrop must sit above the player dock on mobile and full-bleed on wide screens (offset `106`, then `0`).
- S2: The backdrop offset must be a named constant, not a magic number.
- S3: The backdrop offset must be pinned by a test so a dock-height change that shifts the sheet is caught.

## Tasks

- T1 — S1,S2 — inline — extract `106` magic number to a named constant — DONE (50e26b3)
- T2 — S3 — inline — add a test pinning the backdrop bottom offset — DONE (50e26b3)
- T3 — (P3) — skipped: adapters already assessed acceptable (see Log L3) — SKIPPED
- T4 — (P4) — skipped: in-memory repos already covered (see Log L4) — SKIPPED
- T5 — (P5) — skipped: desktop Rust already has tests (see Log L5) — SKIPPED

## Log

- L1: Objective — apply audit follow-up points 1–5 on a new branch (point 6 excluded), re-verifying each point against the current code before acting so already-addressed work is not redone.
- L2: Pre-review confirmed P1 (magic `106` in `station-player.tsx:94`) and P2 (no test pins it) are still open; P3/P4/P5 are already addressed.
- L3: P3 skipped — `conekta-payment-provider.ts` (320 lines) is a single-port adapter already factored into private `mapOrder`/`mapStatus`/`mapCard` helpers and was recorded as acceptable in a prior audit (memory #711). The `d1-*` repositories are cohesive aggregate repositories with private `mapRow` mappers; further extraction would fragment them without a behavioral win.
- L4: P4 skipped — `InMemoryAccountRepository` already has direct invariant tests (`domain/accounts/account-repository.test.ts`); the other in-memory repositories are test doubles exercised indirectly through domain use-case tests. Adding dedicated test files for every double is over-engineering.
- L5: P5 skipped — the desktop Tauri app already has 10 `#[test]` cases across `src-tauri/src/tray/*`; the prior audit note about untested Rust was a false positive.
- L6: T1+T2 applied in 50e26b3 — `SHEET_BACKDROP_BOTTOM_OFFSET = 106` named in `station-player.tsx`, characterization test in `player-landing-channels.test.tsx` pins `106px`. ui typecheck clean, 325 tests green.
