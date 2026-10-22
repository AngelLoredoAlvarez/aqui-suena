# Spike: free staging on Cloudflare Workers (audio stream proxy)

Branch: `spike/cloudflare-streaming` · Status: verified-viable (2026-10-22)

## Question

Can the `packages/api` backend — including the long-lived `/stream` audio proxy —
run on Cloudflare Workers, so the whole staging environment (web + API) is free?

## Answer: yes.

Cloudflare's own limits page states there is **no hard limit on duration for
HTTP-triggered Workers**: while the client stays connected, the Worker keeps
streaming the response body. The relevant constraints:

| Constraint | Free plan | Why it doesn't block us |
| ---------- | --------- | ----------------------- |
| HTTP duration | unlimited (client-connected) | audio streams run hours |
| CPU time | 10 ms / request | piping bytes is ~zero CPU; only compute counts |
| External subrequests | 50 / request | `/stream` makes exactly 1 (fetch the mirror) |
| Memory | 128 MB / isolate | streaming never buffers; bytes are piped |
| Requests | 100,000 / day | ample for staging |

Community-verified: a Workers build has held single streaming requests open for
12+ hours (the 10ms CPU limit is on computation, not wall-clock streaming).

Source: https://developers.cloudflare.com/workers/platform/limits and
https://developers.cloudflare.com/workers/runtime-apis/streams.

## Why this repo diverged from T4's serverless model

T4 App deploys its tRPC backend on Cloudflare Workers. This repo's `packages/api`
kept the same layout but serves it from a long-running Node process
(`node:http` + `tsx`), because of the `/stream` proxy. The streaming core,
however, is already platform-agnostic.

## What the adaptation touches (not done — this is the spike only)

- `packages/api/src/server.ts`: replace the `node:http` `createServer` wrapper
  with a `fetch(request) => Response` handler. The `handleStream` path becomes
  `return proxied` directly (a `Response` with a streamed body).
- tRPC adapter: `@trpc/server/adapters/node-http` → `@trpc/server/adapters/fetch`.
- `packages/api/src/main.ts` (`tsx` process) → `export default { fetch }` entry.
- `packages/api/src/env.ts`: `PORT`/`HOST` → Worker env vars via `wrangler.toml`.
- Build/runtime: `tsx` → bundled Worker (`wrangler` / esbuild).
- `packages/api/src/stream-proxy.ts` (`fetchProxiedStream`): **unchanged** — it
  already takes injected `fetch` and returns a `Response`, which is exactly the
  Worker shape.

Illustrative Worker shape (NOT tested, intent only):

```ts
// packages/api/src/worker.ts (proposed)
import { fetchProxiedStream } from "./stream-proxy";
import { appRouter } from "./router";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/stream") {
      return fetchProxiedStream(fetch, url.searchParams.get("url"));
    }
    if (url.pathname === "/health") return Response.json({ status: "ok" });
    // tRPC via the fetch adapter here
    return new Response("not found", { status: 404 });
  },
};
```

## Recommendation

Path A (Cloudflare) is viable and free. When it becomes a real task, do the
adaptation above as its own feature. The one thing to validate at implementation
time: an end-to-end stream staying open for a long period on the free plan, with
real audio (a smoke test, not just the docs).
