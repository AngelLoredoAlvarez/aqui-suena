# api

The backend of the monorepo, in one package: the shared tRPC contract *and* the
node process that serves it. This mirrors the T4 stack (`packages/api` is the
worker that deploys itself), so web, desktop and mobile call one backend and no
secret ever has to live inside a distributed binary.

## Run

```bash
pnpm --filter @aqui-suena/api dev     # tsx watch, reloads on change
pnpm --filter @aqui-suena/api start   # production process
pnpm --filter @aqui-suena/api test    # vitest, node environment
```

`tsx` runs the TypeScript sources directly, so the deployable ships sources
instead of a build artifact. It is a **runtime** dependency, not a dev one: a
production install without devDependencies still has to boot. `typecheck` is the
gate that proves the types, exactly like the other packages.

## Environment

| Variable          | Default  | Purpose                                                 |
| ----------------- | -------- | ------------------------------------------------------- |
| `PORT`            | `3001`   | TCP port. Must be an integer between 1 and 65535.        |
| `HOST`            | `0.0.0.0`| Bind address. Container platforms need every interface.  |
| `ALLOWED_ORIGINS` | see below| Comma-separated extra origins for CORS.                  |

## Routes

| Route          | Method     | Behavior                                             |
| -------------- | ---------- | ---------------------------------------------------- |
| `/health`      | `GET`      | `{"status":"ok"}` for deploy probes.                  |
| `/trpc/*`      | `GET,POST` | The shared `appRouter` from `./router`.               |
| `/stream?url=` | `GET`      | Proxies an allowlisted radio mirror, streamed.        |

## Layout, and the one rule that keeps it safe

| Path                | Side   | Reachable from a browser or React Native |
| ------------------- | ------ | ---------------------------------------- |
| `src/client.ts`     | shared | yes — the only safe entry for clients     |
| `src/listener.ts`   | shared | yes — schemas only                        |
| `src/router.ts`     | server | no — evaluates `initTRPC.create()`        |
| `src/server.ts`     | server | no — imports `node:http` and `node:stream`|
| `src/cors.ts`       | server | no                                        |
| `src/env.ts`        | server | no                                        |
| `src/main.ts`       | server | no — starts the process                   |

**Never re-export `server.ts`, `cors.ts`, `env.ts` or `main.ts` from
`index.ts`.** Clients import subpaths (`@aqui-suena/api/client`), so Metro and
Next only bundle what they actually reach; adding a server export to the root
would drag `node:http` into the mobile and web bundles. The dependency-cruiser
rule `client-never-imports-server-entry` fails the build if a client imports
anything other than the client-safe entries.

## Origin contract per platform

CORS is a browser mechanism, not authentication. The policy distinguishes three
shapes:

| Client                | Origin header            | Result                       |
| --------------------- | ------------------------ | ---------------------------- |
| Web (dev)             | `http://localhost:3000`  | allowed                      |
| Desktop (Linux/macOS) | `tauri://localhost`      | allowed                      |
| Desktop (Windows)     | `http://tauri.localhost` | allowed                      |
| Mobile (React Native) | none                     | allowed                      |
| Anything else         | any other value          | `403`, no CORS headers        |

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
  runtime is impossible; it must be passed when the bundle is built.

## Why a static desktop client is safe here

The desktop bundle is a client. Anything that needs a secret — database access,
chatbot API keys — runs in this process. A key embedded in a distributable
binary is extractable, so "the backend runs inside the app" is never an option
for a public build, no matter how convenient it looks.
