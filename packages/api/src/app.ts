import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { corsHeaders, preflightHeaders, resolveCors } from "./cors";
import { appRouter } from "./router";
import { fetchProxiedStream } from "./stream-proxy";

export interface AppOptions {
  allowedOrigins: readonly string[];
  // Injected for tests: the stream route must never reach the network there.
  upstreamFetch?: typeof fetch;
}

export function createApp(options: AppOptions): Hono {
  const upstreamFetch = options.upstreamFetch ?? fetch;
  const app = new Hono();

  // Origin policy: refuse unknown origins before anything runs, answer
  // preflight, and stamp CORS headers on the final response of every route.
  // Headers are applied after `next()` on `c.res` so they survive handlers
  // that return a raw Response (the tRPC adapter and the stream proxy do).
  app.use("*", async (c, next) => {
    const origin = c.req.header("origin") ?? null;
    const decision = resolveCors(origin, options.allowedOrigins);

    if (!decision.allowed) {
      return c.text("forbidden origin", 403, { vary: "Origin" });
    }

    if (c.req.method === "OPTIONS") {
      const headers =
        decision.origin === null ? { vary: "Origin" } : preflightHeaders(decision.origin);
      for (const [name, value] of Object.entries(headers)) c.header(name, value);
      return c.body(null, 204);
    }

    await next();

    for (const [name, value] of Object.entries(corsHeaders(decision.origin))) {
      c.res.headers.set(name, value);
    }
  });

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.get("/stream", async (c) => {
    const proxied = await fetchProxiedStream(upstreamFetch, c.req.query("url") ?? null);
    return new Response(proxied.body, { status: proxied.status, headers: proxied.headers });
  });

  app.use("/trpc/*", trpcServer({ router: appRouter, createContext: () => ({}) }));

  app.notFound((c) => c.text("not found", 404));

  return app;
}
