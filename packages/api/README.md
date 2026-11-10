# api

The backend of the monorepo, in one package: the shared tRPC contract _and_ the
fetch handler that serves it. This mirrors the T4 stack (`packages/api` is the
worker that deploys itself), so web, desktop and mobile call one backend and no
secret ever has to live inside a distributed binary. The same portable core
(`src/server/http/app.ts`) runs as a Node process (`src/server/main.ts`) and as a Cloudflare
Worker (`src/server/worker.ts`).

## Run

```bash
pnpm --filter @aqui-suena/api dev     # tsx watch, reloads on change
pnpm --filter @aqui-suena/api start   # production process
pnpm --filter @aqui-suena/api test    # vitest, node environment
pnpm --filter @aqui-suena/api test:coverage  # vitest + v8 coverage (text, lcov)
```

`tsx` runs the TypeScript sources directly, so the deployable ships sources
instead of a build artifact. It is a **runtime** dependency, not a dev one: a
production install without devDependencies still has to boot. `typecheck` is the
gate that proves the types, exactly like the other packages.

## Environment

| Variable          | Default    | Purpose                                                                                                 |
| ----------------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| `PORT`            | `3001`     | TCP port. Must be an integer between 1 and 65535.                                                       |
| `HOST`            | `0.0.0.0`  | Bind address. Container platforms need every interface.                                                 |
| `ALLOWED_ORIGINS` | see below  | Comma-separated extra origins for CORS.                                                                 |
| `RESEND_API_KEY`  | (optional) | Reserved for transactional email. No email call site is wired yet, so setting it changes nothing today. |

## Routes

| Route                             | Method                        | Behavior                                                    |
| --------------------------------- | ----------------------------- | ----------------------------------------------------------- |
| `/health`                         | `GET`                         | `{"status":"ok","media":"configured"\|"unconfigured"}`.     |
| `/trpc/*`                         | `GET,POST`                    | The shared `appRouter` from `./router`.                     |
| `/stream?url=`                    | `GET`                         | Proxies an allowlisted radio mirror, streamed.              |
| `/admin/seed-plans`               | `POST` (Bearer `ADMIN_TOKEN`) | Idempotently upserts the plan catalog into D1.              |
| `/admin/seed-vectors`             | any (Bearer `ADMIN_TOKEN`)    | Embeds active plans into the Vectorize index.               |
| `/admin/purge-expired-businesses` | `POST` (Bearer `ADMIN_TOKEN`) | Permanently deletes businesses past their 90-day retention. |

Media storage is explicit: the Worker passes `R2ObjectStorage` only when the
three R2 credentials are complete. Missing or partial credentials leave media
unconfigured (`/health` says so) and media mutations answer
`SERVICE_UNAVAILABLE`; the router never substitutes `InMemoryObjectStorage`.
Only the local Node entry (`server/main.ts`) injects that adapter, on purpose.

## Email (transactional)

The email stack is implemented but **not wired to production**. What exists:

- The 10 template definitions, runtime renderer (`renderEmail`) and copy files
  in `src/infrastructure/email/`.
- `ResendEmailSender` (`src/infrastructure/email/resend-email-sender.ts`), an
  adapter for the `EmailSender` port.
- `TemplateSubscriptionNotifier`, `TemplateAccountNotifier` and
  `TemplatePaymentNotifier`, each covered by tests.

What is missing: `ResendEmailSender` is never instantiated in a composition
root (`server/worker.ts`, `server/main.ts`, `server/http/app.ts`), no notifier
is constructed outside tests, and no domain flow calls one. No email leaves the
system, whether or not `RESEND_API_KEY` is set. Wiring the sender into the
composition and adding the trigger call sites is tracked in
`odd/tasks/backlog.md`.

## Known placeholders

This endpoint is reachable in production but serves mock data. It is kept for
client integration and is covered by tests; it is not an implementation of its
eventual behavior.

| Endpoint             | Returns today                                                                  | Missing                                                        |
| -------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `listener.getStatus` | A fixed station (`MOCK_ACTIVE_URL`) with `listeners: 42` for any requested id. | Real listener counts and the live stream URL from persistence. |

## Layout, and the one rule that keeps it safe

| Path                           | Side   | Reachable from a browser or React Native  |
| ------------------------------ | ------ | ----------------------------------------- |
| `src/client.ts`                | shared | yes — the only safe entry for clients     |
| `src/domain/radio/listener.ts` | shared | yes — schemas only (subpath `./listener`) |
| `src/shared/stream-proxy.ts`   | shared | yes — zero-import stream proxy core       |
| `src/server/http/app.ts`       | server | no — the portable fetch handler           |
| `src/server/worker.ts`         | server | no — Cloudflare Workers entry             |
| `src/server/trpc/router.ts`    | server | no — evaluates `initTRPC.create()`        |
| `src/server/server.ts`         | server | no — node:http bridge to `app.ts`         |
| `src/server/http/cors.ts`      | server | no                                        |
| `src/server/env.ts`            | server | no                                        |
| `src/infrastructure/email/`    | server | no — renderer, adapter and copy           |
| `design/email-templates/`      | design | no — SPEC, template contract and samples  |
| `src/server/main.ts`           | server | no — starts the Node process              |

**Never re-export `server.ts`, `cors.ts`, `env.ts` or `main.ts` from
`index.ts`.** Clients import subpaths (`@aqui-suena/api/client`), so Metro and
Next only bundle what they actually reach; adding a server export to the root
would drag `node:http` into the mobile and web bundles. The dependency-cruiser
rule `client-never-imports-server-entry` fails the build if a client imports
anything other than the client-safe entries.

## Directory conventions

- `src/domain/<context>/` holds one bounded context. Use a singular or mass noun
  when the folder models one concept (`billing`, `directory`, `email`, `media`,
  `radio`, `support`), and the plural of the feature when it groups several
  (`ads`, `accounts`, `subscriptions`, `payments`).
- `src/domain/plans/` is the shared kernel: the plan catalog and its
  entitlements. It imports no other domain module, so billing, directory, ads
  and support can all depend on it without coupling to each other.
- `src/domain/billing/` subdivides into `subscriptions/` (lifecycle, grace,
  reminders, notifiers) and `payments/` (payments, invoices, receipt notifier).
  Billing may depend on directory (a downgrade hides businesses), never the
  reverse; `directory/retention.ts` owns the hiding and retention helpers.
- `src/infrastructure/<context>/` mirrors the domain module it implements. One
  adapter per port; no business rules.
- `src/testing/` holds test-only doubles (`FakeEmailSender`, the `Fake*Notifier`
  classes). Production files must never import it; the `pnpm arch` rule
  `production-must-not-import-test-support` enforces that, with `.test.ts`
  files exempt. In-memory adapters that production also uses
  (`InMemoryObjectStorage`, `InMemory*Repository`) stay next to their port, not
  here.
- `src/server/composition/` is the only place that picks drivers. Both entry
  points share it: adding a repository means editing `repositories.ts` once.
- Directory mutations are owner-scoped: `domain/directory/authorization.ts`
  owns `assertOwnsBusiness`, and the server adapter maps a denial to
  `NOT_FOUND` so a foreign resource never leaks its existence. Public
  `list`/`getById` reads filter `hidden_at IS NULL`; owner reads use
  `getByIdForOwner`/`listByAccount` and stay unfiltered.
- Client-caused failures use typed domain errors, mapped once in
  `server/trpc/trpc.ts`: `ValidationError` → `BAD_REQUEST`, `NotFoundError` →
  `NOT_FOUND`, `ConflictError` → `CONFLICT`. A missing or foreign entity is
  `NOT_FOUND`, never `null`/`false`. Persisted values are parsed on read
  (`parsePlanId`, `parseBusinessCategory`, `parseSubscriptionStatus`,
  `parsePaymentStatus`); an unknown value raises `DataIntegrityError`, which is
  logged with its field and value and answered as a generic
  `INTERNAL_SERVER_ERROR`.
- `packages/api/design/` holds design artifacts (specs, the template contract,
  pre-rendered samples). Nothing there is imported at runtime.
- Layer rules are enforced by `pnpm arch`: `domain` cannot import
  `infrastructure` or `server`; `infrastructure` cannot import `server`;
  `directory` cannot import `billing`; `plans` cannot import any other domain
  module; and no file may form a dependency cycle. Tests are exempt from the
  layer rules because they may wire real adapters.

## Origin contract per platform

CORS is a browser mechanism, not authentication. The policy distinguishes three
shapes:

| Client                | Origin header            | Result                 |
| --------------------- | ------------------------ | ---------------------- |
| Web (dev)             | `http://localhost:3000`  | allowed                |
| Desktop (Linux/macOS) | `tauri://localhost`      | allowed                |
| Desktop (Windows)     | `http://tauri.localhost` | allowed                |
| Mobile (React Native) | none                     | allowed                |
| Anything else         | any other value          | `403`, no CORS headers |

A missing `Origin` is allowed on purpose: React Native's fetch sends none, and
rejecting it would break Android and iOS. Do not treat "no origin" as trusted —
authentication belongs on the route, not on CORS.

Production web domains are added through `ALLOWED_ORIGINS`; the three platform
origins stay on by default.

### Base URL per client

- **Web**: same-origin in the browser, so a relative `/trpc` works; the server
  build rewrites `/api/stream` to this server's `/stream`, so the browser keeps
  its old URL. Set `NEXT_PUBLIC_API_BASE_URL` when the API is on another host.
- **Desktop**: absolute URL from `NEXT_PUBLIC_API_BASE_URL`, baked at build time,
  because the packaged app runs on `tauri://localhost` and has no server of its
  own. The Tauri bundle is a static export, so it cannot host route handlers.
- **Mobile**: `EXPO_PUBLIC_API_BASE_URL`, inlined at bundle time. Changing it at
  runtime is impossible; it must be passed when the bundle is built. Native also
  needs `EXPO_PUBLIC_STREAM_BASE_URL` for the `/test-streams` fixtures served by
  the web deployment; see `apps/mobile/STAGING.md`.

## Why a static desktop client is safe here

The desktop bundle is a client. Anything that needs a secret — database access,
chatbot API keys — runs in this process. A key embedded in a distributable
binary is extractable, so "the backend runs inside the app" is never an option
for a public build, no matter how convenient it looks.

## Support chatbot retrieval (Vectorize) and AI Gateway

The `support.chat` router builds its plan-catalog context through the
`PlanCatalogRetriever` port (`src/domain/support/plan-catalog.ts`). Two
implementations:

- `FullCatalogRetriever` (default): injects every plan into the prompt. Used
  in tests, local dev, and whenever the Vectorize binding is absent.
- `VectorPlanCatalogRetriever`: embeds the question (Workers AI
  `@cf/baai/bge-m3`), queries the Vectorize index, and injects the top-K
  plans by similarity score. Any embedding or index failure falls back to the
  full catalog — the chatbot never breaks because of the RAG layer.

### Enabling Vectorize (optional)

1. Create the index:
   `npx wrangler vectorize create aqui-suena-plan-catalog --dimensions 1024 --metric cosine`
   (1024 = `@cf/baai/bge-m3` output dimensions; free tier: 30M queried
   dims/month, 5M stored dims, 100 indexes — ample for the plan catalog).
2. Uncomment the `[[vectorize]]` block in `wrangler.toml`.
3. Deploy, then seed once: `curl -X POST <worker-url>/admin/seed-vectors -H "Authorization: Bearer $ADMIN_TOKEN"`.
   The route requires the `ADMIN_TOKEN` var/secret and returns 404 without
   it. It embeds every active plan from D1 and upserts the vectors.

### Enabling AI Gateway (optional)

1. Dashboard → AI → AI Gateway → create a gateway (e.g. `aqui-suena`).
2. Put its id in `AI_GATEWAY_ID` (a `[vars]` entry in `wrangler.toml`).
3. Redeploy. AI calls then flow through the gateway (free analytics,
   caching, and rate limiting; the 5% fee only applies to Unified Billing
   credits, which we do not use).
