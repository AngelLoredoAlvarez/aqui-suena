import type { SubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/subscription-notifier";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { HARNESS_STATIONS } from "@aqui-suena/api/domain/radio/harness";
import {
  InMemoryStationRepository,
  type StationRepository,
} from "@aqui-suena/api/domain/radio/station";
import type { PlanCatalogRetriever } from "@aqui-suena/api/domain/support/plan-catalog";
import { defaultPlanRepository } from "@aqui-suena/api/server/composition/plans";
import {
  createInMemoryRepositories,
  type DirectoryRepositories,
} from "@aqui-suena/api/server/composition/repositories";
import { corsHeaders, preflightHeaders, resolveCors } from "@aqui-suena/api/server/http/cors";
import { type RequestLogger, requestLogging } from "@aqui-suena/api/server/http/observability";
import type { AiBinding } from "@aqui-suena/api/server/routers/support";
import { createContext, createSupabaseFromEnv } from "@aqui-suena/api/server/trpc/context";
import { createAppRouter } from "@aqui-suena/api/server/trpc/router";
import { fetchProxiedStream } from "@aqui-suena/api/shared/stream-proxy";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";

export interface AppOptions {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseSecretKey?: string;
  supabaseJwksUrl?: string;
  allowedOrigins: readonly string[];
  // Injected for tests: the stream route must never reach the network there.
  upstreamFetch?: typeof fetch;
  ai?: AiBinding;
  planCatalogRetriever?: PlanCatalogRetriever;
  aiGatewayId?: string;
  planRepository?: PlanRepository;
  directoryRepositories?: DirectoryRepositories;
  stationRepository?: StationRepository;
  mediaStorage?: ObjectStorage;
  subscriptionNotifier?: SubscriptionNotifier;
  logger?: RequestLogger;
  logRequests?: boolean;
}

export function createApp(options: AppOptions): Hono {
  const upstreamFetch = options.upstreamFetch ?? fetch;
  const planRepository = options.planRepository ?? defaultPlanRepository;
  const directoryRepositories = options.directoryRepositories ?? createInMemoryRepositories();
  const stationRepository =
    options.stationRepository ?? new InMemoryStationRepository([...HARNESS_STATIONS]);
  const appRouter = createAppRouter(
    planRepository,
    directoryRepositories,
    stationRepository,
    options.ai,
    options.planCatalogRetriever,
    options.aiGatewayId,
    options.mediaStorage,
    options.subscriptionNotifier,
  );
  const supabase = createSupabaseFromEnv(options.supabaseUrl, options.supabaseAnonKey);

  const app = new Hono();

  // Logging runs before CORS so refused origins and preflights are observable.
  if (options.logRequests !== false) {
    app.use("*", requestLogging(options.logger));
  }

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

  app.get("/health", (c) =>
    c.json({
      status: "ok",
      media: options.mediaStorage === undefined ? "unconfigured" : "configured",
    }),
  );

  app.get("/stream", async (c) => {
    const proxied = await fetchProxiedStream(upstreamFetch, c.req.query("url") ?? null);
    return new Response(proxied.body, { status: proxied.status, headers: proxied.headers });
  });

  app.use(
    "/trpc/*",
    trpcServer({
      router: appRouter,
      createContext: ({ req }) => createContext(req, supabase),
    }),
  );

  app.notFound((c) => c.text("not found", 404));

  return app;
}
