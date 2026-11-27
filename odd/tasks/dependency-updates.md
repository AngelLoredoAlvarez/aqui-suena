# Dependency updates across the monorepo

Objective: bring every direct dependency in the pnpm workspace and the desktop Rust crate to its latest compatible release, with one consistent lockfile, and prove the workspace still typechecks, tests, and builds. Branch `chore/dependency-updates`. Test runner: `vitest run` per package plus `node --test "scripts/*.test.mjs"`.

## Specs

- S1: Every direct dependency declared in the pnpm workspace manifests and the shared catalog resolves to its latest published version.
- S2: The desktop Tauri crate resolves its declared ranges to the latest compatible versions in `Cargo.lock`.
- S3: `pnpm install` produces one consistent lockfile and the singleton policy (`scripts/check-singletons.mjs`) still holds.
- S4: `pnpm typecheck`, `pnpm test`, `pnpm arch`, and the workspace builds pass on the updated tree.
- S5: Documentation references to dependency versions remain accurate.

## Tasks

- T1 — S1 — inline — update pnpm workspace dependencies to latest — DONE
- T2 — S2 — inline — update the desktop Rust lockfile — DONE
- T3 — S3 — inline — reinstall and run the singleton check — DONE
- T4 — S4 — inline — run typecheck, tests, architecture, and builds — DONE
- T5 — S5 — inline — verify docs have no stale version references — DONE

## Log

- L1: Objective — update the monorepo's dependency versions on a dedicated branch and verify the result before reporting.
- L2: Baseline is `main` at 888c65a. `pnpm outdated -r` reports 19 minor/patch updates and no major bumps.
- L3: The Rust crate declares wide semver ranges (`tauri = "2"`, `serde = "1"`); `cargo update --dry-run` reports 104 transitive lockfile updates.
- L4: `pnpm update -r --latest` bumped 19 direct dependencies, including `expo` 58.0.26 -> 58.1.0, `@trpc/*` 11.29.7 -> 11.31.5, `vitest` and `@vitest/coverage-v8` 5.1.1 -> 5.1.2, `wrangler` 4.166.0 -> 4.168.0, and the `@tanstack/react-query` and `expo-image` catalog entries. `@types/react` had to be bumped manually in the catalog (19.3.0 -> 19.3.3) because pnpm will not rewrite a version controlled by an override. `pnpm outdated -r` is now empty.
- L5: `expo install --check` still reports the same pre-existing version deviations that were already on `main` (async-storage, react, gesture-handler, reanimated, svg, typescript); the packages touched by this update are consistent with Expo 58.1.0. Updated `biome.json` `$schema` to 2.6.9 to match the new Biome release.
- L6: `cargo update` refreshed 104 transitive crates in `apps/desktop/src-tauri/Cargo.lock` within the declared ranges.
- L7: Verification — `pnpm exec biome check .`, `pnpm arch` (665 modules), `pnpm -r typecheck` (8 projects), `pnpm test` (7 tasks), `pnpm -r test:coverage` (all thresholds green after one UI timeout flake on the first run), `pnpm --filter @aqui-suena/db db:generate` (no migration drift), `pnpm build` (8 tasks, includes the Tauri release build and bundles), `cargo test` (10 passed), `pnpm check:singletons` (15 singletons), and `E2E_PORT=3000 pnpm --filter web test:e2e` (20 passed; reused the dev server already listening on 3000).
- L8: No documentation referenced the updated versions, so no doc edits were needed.
- L9: Native assessment over the commit against 888c65a returned `medium` risk, `review_due: false`, `review_due_reason: under_budget`. Risk line: item 5, dependency changes alter the installed environment.
