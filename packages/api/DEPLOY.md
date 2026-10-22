# Deploying the API to Cloudflare Workers

The backend has a portable fetch handler (`src/app.ts`) with two runtime entries:
the Node process (`src/main.ts`, used by `pnpm dev`) and a Cloudflare Worker
(`src/worker.ts`). This documents the first deploy of the Worker, which is also
the smoke test that confirms long-lived audio streaming works on the free plan.

## Prerequisites

1. A Cloudflare account (free plan is enough).
2. `wrangler` authenticated once. It is a root devDependency, so `pnpm install`
   already provides it — only the login is manual:
   ```bash
   pnpm exec wrangler login
   ```

## Deploy

```bash
pnpm --filter @aqui-suena/api deploy:worker
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
   curl 'https://<worker>/trpc/listener.getStatus?input=%7B%22stationId%22%3A%22station-1%22%7D'
   ```
   The `input` is the URL-encoded JSON of the procedure input — tRPC v11 with the
   default transformer sends it unwrapped (no `"json"` envelope). Expected:
   `{"result":{"data":{"station":{...},"listeners":42}}}`.

3. **Stream** — the critical one. Fetch the proxied mirror and let it run for
   several minutes, confirming bytes keep arriving (this is what the Cloudflare
   docs promise but has not yet been verified on the free plan):
   ```bash
   curl -sN 'https://<worker>/stream?url=https%3A%2F%2Fice1.somafm.com%2Fgroovesalad-128-mp3' -o /tmp/stream.mp3
   # in another terminal, watch it grow:
   watch -n 2 'ls -l /tmp/stream.mp3'
   ```

## Wiring the clients afterward

- web: see `apps/web/DEPLOY.md` (`pnpm deploy:web` builds the static export
  with the Worker URL baked in and deploys it to Cloudflare Pages)
- desktop: `NEXT_PUBLIC_API_BASE_URL=https://<worker>` at `pnpm --filter desktop build`
- mobile: `EXPO_PUBLIC_API_BASE_URL=https://<worker>` for the `/stream` proxy
  and `EXPO_PUBLIC_STREAM_BASE_URL=https://<pages>` for the `/test-streams`
  fixtures when bundling; see `apps/mobile/STAGING.md`

Production web domains go into `ALLOWED_ORIGINS` in `wrangler.toml`. Setting
that variable replaces the built-in defaults, so keep the origins you still need
in the list.

## Tear down (turn it off)

The Workers free plan is $0 and never bills — exceeding a limit throttles, it
does not charge. To remove the deployment entirely (e.g. after a test):

```bash
pnpm --filter @aqui-suena/api exec wrangler delete
```

This deletes the Worker and its route. Re-deploy later with the `deploy:worker`
command above.
