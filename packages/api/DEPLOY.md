# Deploying the API to Cloudflare Workers

The backend has a portable fetch handler (`src/app.ts`) with two runtime entries:
the Node process (`src/main.ts`, used by `pnpm dev`) and a Cloudflare Worker
(`src/worker.ts`). This documents the first deploy of the Worker, which is also
the smoke test that confirms long-lived audio streaming works on the free plan.

## Prerequisites

1. A Cloudflare account (free plan is enough).
2. `wrangler` authenticated once. It is a devDependency of `packages/api`, so
   `pnpm install` already provides it — only the login is manual:
   ```bash
   pnpm --filter @aqui-suena/api exec wrangler login
   ```

## Deploy

```bash
pnpm --filter @aqui-suena/api deploy
```

This runs `wrangler deploy`, which bundles `src/worker.ts` (and its relative
imports) with esbuild and uploads the Worker. Note the URL it prints, e.g.
`https://aqui-suena-api.<your-subdomain>.workers.dev`.

`nodejs_compat` is enabled in `wrangler.toml` as a safety net for any Node
built-ins the `@trpc/server` bundle references; it can be removed later if the
first deploy proves it is not needed.

## Smoke test (in this order)

Replace `<worker>` with the deployed URL.

1. **Health** — proves the Worker boots and routes:
   ```bash
   curl https://<worker>/health
   # -> {"status":"ok"}
   ```

2. **tRPC** — proves the shared router runs on the edge (GET query):
   ```bash
   curl 'https://<worker>/trpc/listener.getStatus?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22stationId%22%3A%22station-1%22%7D%7D%7D'
   ```
   The exact `input` encoding is tRPC's; an easier check is to point the web app
   at the Worker and confirm the landing shows the listener status.

3. **Stream** — the critical one. Fetch the proxied mirror and let it run for
   several minutes, confirming bytes keep arriving (this is what the Cloudflare
   docs promise but has not yet been verified on the free plan):
   ```bash
   curl -sN 'https://<worker>/stream?url=https%3A%2F%2Fice1.somafm.com%2Fgroovesalad-128-mp3' -o /tmp/stream.mp3
   # in another terminal, watch it grow:
   watch -n 2 'ls -l /tmp/stream.mp3'
   ```

## Wiring the clients afterward

- web: `NEXT_PUBLIC_API_BASE_URL=https://<worker> pnpm --filter web build`
- desktop: same variable at `pnpm --filter desktop build`
- mobile: `EXPO_PUBLIC_API_BASE_URL=https://<worker>` when bundling

Production web domains go into `ALLOWED_ORIGINS` in `wrangler.toml`.
