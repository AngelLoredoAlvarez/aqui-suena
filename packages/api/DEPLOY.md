# Deploying the API to Cloudflare Workers

The backend has a portable fetch handler (`src/app.ts`) with two runtime entries:
the Node process (`src/main.ts`, used by `pnpm dev`) and a Cloudflare Worker
(`src/server/worker.ts`). This documents the first deploy of the Worker, which is also
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

This runs `wrangler deploy`, which bundles `src/server/worker.ts` (and its relative
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
   # -> {"status":"ok","media":"configured"}
   ```

   `media` is `unconfigured` when the R2 credentials are missing (or only
   partially set), and media mutations then answer `503 SERVICE_UNAVAILABLE`.
   Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and,
   optionally, `R2_BUCKET_NAME`/`R2_ENDPOINT` as Worker secrets/vars.

   **Current staging state:** none of the `R2_*` secrets are configured, so the
   staging deployment reports `media: unconfigured` and every media mutation
   answers `503`. Media features cannot be exercised there until those secrets
   are set. This is the intended explicit-storage behavior, not a bug.

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

## Admin endpoints

All four require `Authorization: Bearer <ADMIN_TOKEN>`; when `ADMIN_TOKEN` is
not configured or does not match they answer `404`, so the routes stay hidden.

```bash
# Seed/update the D1 plan catalog (idempotent). Run once per environment.
curl -fsS -X POST https://<worker>/admin/seed-plans \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# -> {"seeded":3}

# Seed the owned harness stations (idempotent). Requires STREAM_BASE_URL in the
# environment; staging sets it in wrangler.toml. Production intentionally omits
# it because the harness never ships to prod.
curl -fsS -X POST https://<worker>/admin/seed-stations \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# -> {"seeded":3}

# Seed the Vectorize plan index used by support.chat.
curl -fsS https://<worker>/admin/seed-vectors \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Delete businesses past their 90-day retention window.
curl -fsS -X POST https://<worker>/admin/purge-expired-businesses \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Current staging state:** `POST /admin/seed-plans` has never been run against
staging, so its D1 plan catalog holds **0 rows**. Until the command above is
executed, anything that reads plans from the database (plans listing,
entitlements resolved from D1) sees an empty catalog. Run the seed once per
environment after migrating D1; it is idempotent and safe to repeat.
`POST /admin/seed-stations` has not been run either; until it is,
`listener.getStatus` answers `NOT_FOUND` in staging because the Worker reads
stations from D1. `listener.getStatus` returns a deterministic simulated count
until a real listener source exists.

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
