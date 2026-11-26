import type { PaymentCustomerDeleter } from "@aqui-suena/api/domain/accounts/payment-customer-deleter";
import type { SubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/ports/subscription-notifier";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { HARNESS_STATIONS } from "@aqui-suena/api/domain/radio/harness";
import type { StationRepository } from "@aqui-suena/api/domain/radio/station";
import type { PlanCatalogRetriever } from "@aqui-suena/api/domain/support/plan-catalog";
import { InMemoryStationRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-station-repository";
import { createDeleteAccount } from "@aqui-suena/api/server/composition/accounts";
import { defaultPlanRepository } from "@aqui-suena/api/server/composition/plans";
import {
  createInMemoryRepositories,
  type DirectoryRepositories,
} from "@aqui-suena/api/server/composition/repositories";
import { probeMediaStorage } from "@aqui-suena/api/server/http/health";
import {
  corsHeaders,
  preflightHeaders,
  resolveCors,
} from "@aqui-suena/api/server/http/middleware/cors";
import {
  type RequestLogger,
  requestLogging,
  silentErrorHandler,
} from "@aqui-suena/api/server/http/middleware/observability";
import { rateLimitingMiddleware } from "@aqui-suena/api/server/http/middleware/rate-limit";
import { createPublicImageHandler } from "@aqui-suena/api/server/http/public-images";
import type { AiBinding } from "@aqui-suena/api/server/routers/support";
import { createContext, createSupabaseFromEnv } from "@aqui-suena/api/server/trpc/context";
import type { BillingSurfaces } from "@aqui-suena/api/server/trpc/router";
import { createAppRouter } from "@aqui-suena/api/server/trpc/router";
import { fetchProxiedStream } from "@aqui-suena/api/shared/stream-proxy";
import { trpcServer } from "@hono/trpc-server";
import { type Handler, Hono } from "hono";

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
  paymentCustomerDeleter?: PaymentCustomerDeleter;
  subscriptionNotifier?: SubscriptionNotifier;
  logger?: RequestLogger;
  logRequests?: boolean;
  billing?: BillingSurfaces;
  conektaWebhook?: Handler;
  // Cloudflare binding; absent in the Node dev server and tests.
  rateLimiter?: RateLimit;
}

export function createApp(options: AppOptions): Hono {
  const upstreamFetch = options.upstreamFetch ?? fetch;

  const planRepository = options.planRepository ?? defaultPlanRepository;

  const directoryRepositories = options.directoryRepositories ?? createInMemoryRepositories();

  const stationRepository =
    options.stationRepository ?? new InMemoryStationRepository([...HARNESS_STATIONS]);

  const deleteAccount = createDeleteAccount({
    repositories: directoryRepositories,
    storage: options.mediaStorage,
    paymentCustomers: options.paymentCustomerDeleter,
    supabaseUrl: options.supabaseUrl,
    supabaseSecretKey: options.supabaseSecretKey,
  });

  const appRouter = createAppRouter(
    planRepository,
    directoryRepositories,
    stationRepository,
    options.ai,
    options.planCatalogRetriever,
    options.aiGatewayId,
    options.mediaStorage,
    options.subscriptionNotifier,
    options.billing,
    deleteAccount,
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

  // After CORS so a 429 still carries the CORS headers the browser needs.
  if (options.rateLimiter) {
    app.use("*", rateLimitingMiddleware(options.rateLimiter));
  }

  app.get("/health", (c) =>
    c.json({
      status: "ok",
      media: options.mediaStorage === undefined ? "unconfigured" : "configured",
    }),
  );

  // Costs one read, so it stays out of the cheap probe: presence is not access.
  app.get("/health/deep", async (c) =>
    c.json({ status: "ok", media: await probeMediaStorage(options.mediaStorage) }),
  );

  app.get(
    "/images/*",
    createPublicImageHandler({
      media: directoryRepositories.media,
      business: directoryRepositories.business,
      flyer: directoryRepositories.flyer,
      storage: options.mediaStorage,
    }),
  );

  app.get("/stream", async (c) => {
    const proxied = await fetchProxiedStream(upstreamFetch, c.req.query("url") ?? null);
    return new Response(proxied.body, { status: proxied.status, headers: proxied.headers });
  });

  app.post(
    "/webhooks/conekta",
    options.conektaWebhook ?? ((c) => c.text("webhook not configured", 503)),
  );

  app.use(
    "/trpc/*",
    trpcServer({
      router: appRouter,
      createContext: ({ req }) => createContext(req, supabase, directoryRepositories.account),
    }),
  );

  app.notFound((c) => c.text("not found", 404));

  // One logger: without this, Hono's default handler prints the raw stack again.
  app.onError(silentErrorHandler);

  return app;
}
