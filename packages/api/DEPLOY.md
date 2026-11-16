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

## CI deploy (bookmark, migrate, deploy)

`.github/workflows/deploy-api.yml` runs `scripts/deploy-api.mjs`, which does three
things in order and stops if any of them fails:

1. Captures a D1 time-travel bookmark (the rollback point).
2. Applies pending migrations with `wrangler d1 migrations apply`.
3. Deploys the Worker.

Staging runs on every push to `main`; production only from a manual dispatch,
behind the `production` GitHub environment. Locally:

```bash
pnpm deploy:api                 # staging
pnpm deploy:api --env production --yes
```

Production refuses to run without `--yes`, so a local invocation cannot reach it
by accident.

Required repository secrets: `CLOUDFLARE_API_TOKEN` (D1 edit + Workers Scripts
edit, scoped to the account) and `CLOUDFLARE_ACCOUNT_ID`. Create the `staging` and
`production` environments in GitHub; add a required reviewer to `production` so
the job waits for approval.

## CI cost control

The repository is public today, and standard GitHub-hosted runners are free and
unlimited on public repositories. When it becomes private, Actions bills against a
monthly included compute amount: $12 on GitHub Free, which is roughly 2,000
standard Linux minutes at $0.006/minute. Each job rounds up to a whole minute, and
a private repository gets half the machine a public one does.

Two workflows spend that allowance: `quality` on every pull request and push, and
`deploy-api` on pushes that touch the API, the database package, the script or the
lockfile. Three switches, from softest to hardest:

1. **Stop push deploys.** Create the repository variable
   `DEPLOY_API_ON_PUSH` with the value `false` (Settings → Secrets and variables →
   Actions → Variables). Pushes stop deploying; manual dispatches in the Actions
   tab still work, and they are the only remaining consumer.
2. **Disable the workflow.** Actions → `deploy-api` → "…" → Disable workflow. It
   spends zero minutes until re-enabled.
3. **Cap the spend.** Settings → Billing → Actions spending limit = $0. Once the
   included amount is used, jobs fail instead of charging.

`quality` is a required check in branch protection, so disabling it would block
merges. If minutes ever get tight, reduce how often it runs (draft pull requests,
no intermediate pushes) instead of turning it off.

Cloudflare billing is not affected by repository visibility: deploys, D1 migrations
and Time Travel stay on the free plan regardless of whether the repository is
public or private.

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

   **Staging state:** the five `R2_*` secrets are uploaded and the Worker was
   redeployed on 2026-11-10, so staging reports `media: configured`. If a fresh
   environment reports `unconfigured`, media mutations answer `503` until those
   secrets are set; that is the intended explicit-storage behavior, not a bug.

2. **tRPC** — proves the shared router runs on the edge (GET query):

   ```bash
   curl 'https://<worker>/trpc/listener.getStatus?input=%7B%22stationId%22%3A%22station-1%22%7D'
   ```

   The `input` is the URL-encoded JSON of the procedure input — tRPC v11 with the
   default transformer sends it unwrapped (no `"json"` envelope). Expected:
   `{"result":{"data":{"station":{"id":"...","name":"..."},"activeUrl":"...","listeners":42}}}`,
   where `listeners` is a deterministic simulated count, not a stored value.

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

**Staging state (2026-11-10):** `POST /admin/seed-plans` ran successfully and
returned `{"seeded":3}`; D1 holds the three plans and `plans.list` serves them.
`POST /admin/seed-stations` was verified on 2026-11-16: `listener.getStatus`
resolves all three harness stations (`aqui-suena-pop`, `aqui-suena-focus`,
`aqui-suena-night`) with their `STREAM_BASE_URL` stream URLs and answers
`NOT_FOUND` for an unknown id. Run the seed once per new environment after
migrating D1; it is idempotent. `listener.getStatus` returns a deterministic
simulated count until a real listener source exists.

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
