# Web deploy to Cloudflare Pages

Branch: `chore/api-deploy-config` · Status: in progress (2026-10-22)

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

- [ ] T1 — Generalize `DESKTOP_BUILD` → `STATIC_EXPORT` in `apps/web/next.config.ts`
      and `scripts/build-desktop-web.mjs` (S2). Route: inline.
- [ ] T2 — Move `wrangler` to the root devDependencies so both packages resolve
      it (S5). Route: inline.
- [ ] T3 — Add `scripts/deploy-web-pages.mjs` and the root `deploy:web` script
      (S1, S3). Route: inline.
- [ ] T4 — Set `ALLOWED_ORIGINS` in `packages/api/wrangler.toml` to the defaults
      plus the Pages origin (S4). Route: inline.
- [ ] T5 — Add `apps/web/DEPLOY.md` and cross-link it from
      `packages/api/DEPLOY.md` (S3, S4). Route: inline.
- [ ] T6 — Verify: lint, typecheck, api tests, static export build, desktop
      build, arch.

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
