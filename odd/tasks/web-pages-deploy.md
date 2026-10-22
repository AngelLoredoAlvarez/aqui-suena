# Web deploy to Cloudflare Pages

Branch: `chore/api-deploy-config` · Status: implemented + verified (2026-10-22)

## Specs

S1. The web app builds as a static export (`output: "export"`) with
    `NEXT_PUBLIC_API_BASE_URL` baked from the environment, so the browser calls
    the deployed Worker directly for audio.
S2. The static-export build mode is not desktop-specific; the existing desktop
    bundle keeps working through the same mode.
S3. One command builds the static export and deploys it to Cloudflare Pages at a
    stable production URL.
S4. The Worker's CORS allowlist includes the Pages origin while keeping the
    built-in dev/platform origins, so `/stream` is not rejected with 403.
S5. `wrangler` resolves from every workspace package that needs it (the API
    Worker and the Pages deploy).

## Tasks

- [x] T1 — Generalize `DESKTOP_BUILD` → `STATIC_EXPORT` (S2). Commit `d46999f`.
- [x] T2 — Move `wrangler` to the root devDependencies (S5). Commit `d46999f`.
- [x] T3 — Add `scripts/deploy-web-pages.mjs` and the root `deploy:web` script
      (S1, S3). Commit `d46999f`.
- [x] T4 — Set `ALLOWED_ORIGINS` to the defaults plus the Pages origin (S4).
      Commit `d46999f`.
- [x] T5 — Add `apps/web/DEPLOY.md` and cross-link it from
      `packages/api/DEPLOY.md` (S3, S4). Commit `d46999f`.
- [x] T6 — Verify (all). Evidence in L4.

## Log

L1 (2026-10-22, user): "a ok, si confirmado, el deploy del backend y stream
funcionan, prepara el deploy para la web"

- L2: `getListenerStatus` is mock-first (`packages/api/src/client.ts`), so the
  only browser network call is the audio `/stream` request. The deploy therefore
  needs the Worker URL baked and the Pages origin allowed; no tRPC transport is
  involved.
- L3: `parseAllowedOrigins` REPLACES the built-in defaults when `ALLOWED_ORIGINS`
  is set (contrary to the old `wrangler.toml` comment). The value must list every
  origin that must keep working, including the Tauri and localhost defaults.
- L4 (2026-10-22, verification green): `pnpm lint`, `pnpm typecheck`,
  `pnpm test` (7 tasks; 52 API + 90 UI tests), `pnpm arch` (117 modules);
  `STATIC_EXPORT=1 NEXT_PUBLIC_API_BASE_URL=https://example.invalid pnpm --filter web build`
  wrote `apps/web/out/index.html` with the URL baked into `out/_next`;
  `pnpm build:desktop:web` still passes; both `web` and `@aqui-suena/api`
  resolve `wrangler` 4.151.3 from the root. Native assess over
  `fb692a2..d46999f`: medium / under_budget, no native review due.
- L5 (2026-10-22, process incident): the independent verifier probed
  `pnpm --filter @aqui-suena/api run deploy:worker -- --help`; wrangler treated
  `--` as end-of-options and executed a real deploy (version `e6e1e26f-...`).
  Net effect: the live Worker now carries this change's `ALLOWED_ORIGINS`, which
  is the intended config, but it happened without user authorization. Post-check:
  `/health` 200, Pages origin 200, unknown origin 403. Repo untouched; nothing
  pushed; the verifier scratch dir was removed.
- L6 (advisories, not corrected): `globalPassThroughEnv: ["PAGES_PROJECT"]` only
  silences biome's turbo rule; the deploy script spawns bare `wrangler` from
  PATH, which works under `pnpm deploy:web` but not a bare `node` invocation.
