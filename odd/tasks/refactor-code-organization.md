# Refactor: code organization & readability

Branch: feature/refactor-code-organization
Strategy: ask-on-risk
Test runner: pnpm --filter @aqui-suena/ui test (vitest), turbo run typecheck

## Specs

S1. Refactor must not change runtime behavior or public APIs; all existing tests stay green.
S2. Each commit is a single, reviewable refactor step with tests passing.
S3. Extract pure logic and presentation into cohesive modules (SRP, OCP, DIP).
S4. Keep cross-platform compatibility (web + mobile + tests) without platform-specific code in shared modules.

## Tasks

- T1: Extract PlayerCard types to player-card.types.ts (inline)
- T2: Extract playback icon logic to playback-icon.tsx (inline)
- T3: Extract status indicator helpers + StatusRow (inline)
- T4: Extract StationButton (props-driven, no i18n coupling) (inline)
- T5: Simplify Dock to compositor (inline)
- T6: Split player-landing.tsx into channels/dock/player (inline)
- T7: Apply same extraction pattern to station-sheet (inline)
- T8: Run full typecheck + tests + web build; close feature (inline)

## Log

L1: User request: refactor whole project for readability, TDD/SOLID/clean code, commits verified.

L2: Completed T1-T7 refactor; typecheck, tests (106), and web build pass.
