# api

Standalone HTTP server for the shared tRPC router. It is the one deployable that
web, desktop and mobile all call, which keeps database credentials, LLM keys and
any other secret out of a distributed binary.

## Run

```bash
pnpm --filter api dev     # tsx watch, reloads on change
pnpm --filter api start   # production process
pnpm --filter api test    # vitest, node environment
```

`tsx` runs the TypeScript sources directly, so deployment ships sources instead
of a build artifact. `pnpm --filter api typecheck` is the gate that proves the
types, exactly like the other packages.

## Environment

| Variable          | Default  | Purpose                                              |
| ----------------- | -------- | ---------------------------------------------------- |
| `PORT`            | `3001`   | TCP port. Must be an integer between 1 and 65535.    |
| `HOST`            | `0.0.0.0`| Bind address. Container platforms need every interface. |
| `ALLOWED_ORIGINS` | see below| Comma-separated extra origins for CORS.               |

## Routes

| Route            | Method      | Behavior                                              |
| ---------------- | ----------- | ----------------------------------------------------- |
| `/health`        | `GET`       | `{"status":"ok"}` for deploy probes.                   |
| `/trpc/*`        | `GET,POST`  | The shared `appRouter` from `@aqui-suena/api/router`.   |
| `/stream?url=`   | `GET`       | Proxies an allowlisted radio mirror, streamed.         |

## Origin contract per platform

CORS is a browser mechanism, not authentication. The policy distinguishes three
shapes:

| Client            | Origin header                        | Result            |
| ----------------- | ------------------------------------ | ----------------- |
| Web (dev)         | `http://localhost:3000`              | allowed           |
| Desktop (Linux/macOS) | `tauri://localhost`              | allowed           |
| Desktop (Windows) | `http://tauri.localhost`             | allowed           |
| Mobile (React Native) | none                             | allowed           |
| Anything else     | any other value                      | `403`, no CORS headers |

A missing `Origin` is allowed on purpose: React Native's fetch sends none, and
rejecting it would break Android and iOS. Do not treat "no origin" as trusted —
authentication belongs on the route, not on CORS.

Production web domains are added through `ALLOWED_ORIGINS`; the three platform
origins stay on by default.

### Base URL per client

- **Web**: same-origin in the browser, so a relative `/trpc` works; set an
  absolute base URL only when the API is deployed on another host.
- **Desktop**: absolute URL, because the packaged app runs on `tauri://localhost`
  and has no server of its own.
- **Mobile**: `EXPO_PUBLIC_API_BASE_URL`, inlined at bundle time. Changing it at
  runtime is impossible; it must be passed when the bundle is built.

## Why a static desktop client is safe here

The desktop bundle is a client. Anything that needs a secret — database access,
chatbot API keys — runs in this server. A key embedded in a distributable binary
is extractable, so "the backend runs inside the app" is never an option for a
public build, no matter how convenient it looks.
