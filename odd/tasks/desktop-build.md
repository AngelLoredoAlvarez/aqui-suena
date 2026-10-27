# Desktop build — a packaged app that actually ships

Branch: `fix/desktop-build` · Delivery: `ask-on-risk` · Runner: `pnpm test` (vitest, node env)
Objective: make `pnpm --filter desktop build` produce a working bundle from a real static export of the web app, without breaking the browser's audio path.

## Specs

- **S1 — `frontendDist` resolves.** In `apps/desktop/src-tauri/tauri.conf.json`, `build.frontendDist` is `"../../web/out"` (that is `apps/web/out`). The current `"../web/out"` points at `apps/desktop/web/out`, which never exists.
- **S2 — Nothing manual before packaging.** `build.beforeBuildCommand` produces the frontend, so a clean checkout needs one command: `pnpm --dir ../.. build:desktop:web`. `beforeDevCommand` keeps `pnpm --dir ../.. dev:web`.
- **S3 — Export mode is explicit.** `apps/web/next.config.ts` sets `output: "export"` only when `DESKTOP_BUILD === "1"`. The plain `next build` stays a server build; nothing about the web deployment changes.
- **S4 — The export must build.** `DESKTOP_BUILD=1 pnpm --filter web build` finishes and writes `apps/web/out/index.html`. Today it fails with: `Error: export const dynamic = "force-static"/export const revalidate not configured on route "/api/stream" with "output: export".` A dynamic route handler cannot exist in an export, so `apps/web/app/api/stream/route.ts` is removed.
- **S5 — One proxy, one place.** The API server's `GET /stream` is the only stream proxy. The browser keeps requesting `/api/stream`, which the server build maps to `${API_ORIGIN ?? "http://localhost:3001"}/stream` with a Next rewrite, so the browser-visible URL does not change.
- **S6 — Clients resolve the API absolutely when they must.** The shared web audio driver resolves the proxy as `${apiBaseUrl}/stream?url=…` when `apiBaseUrl` is non-empty, and `/api/stream?url=…` when it is empty. `apiBaseUrl` is `NEXT_PUBLIC_API_BASE_URL` for the web and desktop bundles and `EXPO_PUBLIC_API_BASE_URL` for native, matching the contract already documented in `packages/api/README.md`. A packaged app has no `tauri://localhost` backend, so the desktop build must bake a non-empty base.
- **S7 — No silent localhost release.** The desktop build prints a warning when it falls back to `http://localhost:3001`, because an installer pointing at localhost is a development artifact, not a release.
- **S8 — Proof.** `DESKTOP_BUILD=1 pnpm --filter web build` writes `apps/web/out/index.html`; `pnpm test`, `pnpm typecheck`, `pnpm lint` and `pnpm arch` stay green; `pnpm --filter desktop build` produces a bundle.

## Tasks

- [x] T1 — driver base URL: `apiBaseUrl` in `stream-base-url.ts` / `.native.ts`, `streamProxyUrl` in `expo-driver.ts`, with unit tests for both shapes (S6).
- [x] T2 — delete `apps/web/app/api/stream/route.ts` and add the `/api/stream` rewrite (S4, S5).
- [x] T3 — `output: "export"` behind `DESKTOP_BUILD` (S3).
- [x] T4 — `scripts/build-desktop-web.mjs` + root script (S2, S7).
- [x] T5 — `tauri.conf.json`: `frontendDist` and `beforeBuildCommand` (S1, S2).
- [x] T6 — docs: `README.md` desktop section, `packages/api/README.md` base-URL contract (S5, S6).
- [x] T7 — verification: export build, gates, real `tauri build` (S8).

## Log

- **L1 — 2026-10-21, user request (verbatim):**
  > User asked to merge this branch to main, push to remote, delete api-server, then solve the desktop build on a new branch from main, leveraging the T4 App context.
- **L2 — 2026-10-21, merge first.** `feature/api-server` merged into `main` with `--no-ff` (`acdb03c Merge branch 'feature/api-server'`), pushed `9672d90..acdb03c`, local branch deleted. No remote branch existed. New branch `fix/desktop-build` from `main`.
- **L3 — 2026-10-21, the blocker is verified, not assumed.** Temporarily set `output: "export"` in `apps/web/next.config.ts` and ran `pnpm --filter web build`: `Compiled successfully`, then `Failed to collect page data for /api/stream` with `export const dynamic = "force-static"/export const revalidate not configured on route "/api/stream" with "output: export"`. Config restored; no residue. So the route handler is a hard blocker, and a `force-static` handler would be worse than useless: it would pre-render a fixed response and silently break `?url=`.
- **L4 — 2026-10-21, T1 RED then GREEN.** Wrote `streamProxyUrl` cases first: `3 failed | 6 passed` with `TypeError: streamProxyUrl is not a function`. After adding `apiBaseUrl` and the resolver: `2 passed (2)` files, `22 passed (22)` in `src/drivers/`, and the ui package went from 84 to 87 tests.
- **L5 — 2026-10-21, a self-inflicted regression the build caught.** Rewriting `stream-base-url.ts` dropped its existing `streamBaseUrl` export, and the export build failed with `Export streamBaseUrl doesn't exist in target module` (four errors, all the same cause). Restored `streamBaseUrl` beside `apiBaseUrl`. Lesson: `write` on a small module replaces it whole; read before rewriting.
- **L6 — 2026-10-21, export build green.** `DESKTOP_BUILD=1 NEXT_PUBLIC_API_BASE_URL=http://localhost:3001 pnpm --filter web build` finished with `Compiled successfully`, routes `/` and `/_not-found`, and wrote `apps/web/out/index.html`. `grep -rl localhost:3001 apps/web/out/_next` finds the base in a chunk, so the value is really inlined at build time.
- **L7 — 2026-10-21, the browser URL survived the move.** Built the web in server mode, ran the API on 3001 and `next start -p 3100`, then `GET /api/stream` returned `400 missing url` with `Vary: Origin` — the header proves the response came from the API through the rewrite, not from a leftover handler. `?url=https://evil.example/live` returned `403`. Both processes killed by PID; ports 3001 and 3100 verified free.
- **L8 — 2026-10-21, the export polluted the architecture check.** After the first export, `pnpm arch` reported `113 modules` instead of `102`: dependency-cruiser was cruising `apps/web/out`. Added `/out/` to the config's `exclude` (beside `/dist/` and `/build/`), and the count returned to `101` — one less than before, because `app/api/stream/route.ts` no longer exists.
- **L9 — 2026-10-21, pnpm arg quirk.** `pnpm --filter desktop build -- --no-bundle` forwarded `--no-bundle` to `cargo build` (`error: unexpected argument '--no-bundle' found`). The working form is `pnpm --filter desktop exec tauri build --no-bundle`.
- **L10 — 2026-10-21, turbo `strict` would have eaten the mode.** Turbo 2 defaults to `envMode: "strict"`: an env var not declared in `env` never reaches the task. Proof and fix: `rm -rf apps/web/out`, then `DESKTOP_BUILD=1 NEXT_PUBLIC_API_BASE_URL=http://localhost:3001 pnpm exec turbo run build --filter=web` → `5 successful`, `out/index.html` regenerated. `turbo.json`'s `build` task now declares `env: ["DESKTOP_BUILD", "NEXT_PUBLIC_API_BASE_URL", "API_ORIGIN"]` and adds `out/**` to `outputs`. The desktop script bypasses turbo and calls `pnpm --filter web build` directly, but the declaration keeps `turbo run build` honest if anyone uses that path.
- **L11 — 2026-10-21, the packaged build.** `pnpm --filter desktop exec tauri build --no-bundle` → exit 0, `Finished 'release' profile [optimized] target(s) in 11m 06s`, `Built application at: apps/desktop/src-tauri/target/release/aqui-suena-desktop` (14 MB). Its `beforeBuildCommand` ran the export first, so the clean-checkout path is proven end to end. The binary carries 30 embedded assets under `tauri-codegen-assets` — 12 js, 8 txt, 4 woff2, 3 m4a, 3 html, 2 ico — matching the extension spread of the 34 files in `apps/web/out`. Tauri compresses them, which is why no plain string like `localhost:3001` survives in the binary.
- **L12 — 2026-10-21, what is still unproven.** The packaged app was not launched: it needs a display and a running API, so audio playback through `NEXT_PUBLIC_API_BASE_URL` inside the Tauri webview is reasoned, not observed. The browser side of the same path was observed (L7).
