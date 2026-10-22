# Deploying the web app to Cloudflare Pages

The web app is a single static landing: it has no server routes and does its
data work in the browser. It is built as a static export (`output: "export"`)
and served by Cloudflare Pages. The listener card is mock-first, so the only
network call the page makes is the audio `/stream` request to the API Worker.

## Prerequisites

1. The API Worker is deployed and you know its URL (see
   `packages/api/DEPLOY.md`).
2. `wrangler` is authenticated once. It is a root devDependency, so
   `pnpm install` already provides it — only the login is manual:
   ```bash
   pnpm exec wrangler login
   ```

## Deploy

```bash
NEXT_PUBLIC_API_BASE_URL=https://<worker> pnpm deploy:web
```

This builds the static export with the Worker URL baked in and uploads
`apps/web/out` to the Pages project `aqui-suena-web`. Override the project name
with `PAGES_PROJECT=<name>`. The deploy forces a production deployment so the
URL is stable: `https://aqui-suena-web.pages.dev`.

## CORS

The Worker refuses `/stream` with 403 when the browser sends an `Origin` that is
not allowed. `packages/api/wrangler.toml` must list the Pages origin in
`ALLOWED_ORIGINS`, and the Worker must be redeployed after editing it:

```bash
pnpm --filter @aqui-suena/api deploy:worker
```

`ALLOWED_ORIGINS` replaces the built-in defaults, so keep
`http://localhost:3000`, `tauri://localhost` and `http://tauri.localhost` in the
list. If you changed `PAGES_PROJECT`, update the origin to match.

## Preview deployments

`wrangler pages deploy apps/web/out --project-name <name>` without `--branch main`
creates a preview deployment at a generated URL. Preview URLs are not in
`ALLOWED_ORIGINS`, so audio is rejected until the origin is added.
