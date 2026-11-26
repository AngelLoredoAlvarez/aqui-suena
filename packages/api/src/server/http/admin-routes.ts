import { PurgeExpiredBusinesses } from "@aqui-suena/api/domain/directory/purge-expired-businesses";
import { DEFAULT_PLAN_CATALOG, seedPlans } from "@aqui-suena/api/domain/plans/catalog";
import { harnessStations } from "@aqui-suena/api/domain/radio/harness";
import { seedPlanVectors } from "@aqui-suena/api/domain/support/plan-catalog";
import { D1PlanCatalogWriter } from "@aqui-suena/api/infrastructure/plans/d1-plan-catalog-writer";
import { D1StationCatalogWriter } from "@aqui-suena/api/infrastructure/radio/d1-station-catalog-writer";
import type { WorkerCore } from "@aqui-suena/api/server/composition/worker-app";
import { isAdminAuthorized } from "@aqui-suena/api/server/http/admin-auth";
import { isRateLimited } from "@aqui-suena/api/server/http/rate-limit";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";

/**
 * Handles the admin-only endpoints that run before the Hono router so they can
 * apply the rate limiter. Returns undefined when the request is not one of
 * them, so the caller falls through to the app.
 */
export async function handleAdminRequest(
  request: Request,
  env: WorkerEnv,
  core: WorkerCore,
): Promise<Response | undefined> {
  const pathname = new URL(request.url).pathname;

  if (pathname.startsWith("/admin/")) {
    if (await isRateLimited(env.RATE_LIMITER, request)) {
      return new Response("too many requests", { status: 429 });
    }
  }

  // One-off seeding endpoint for the Vectorize plan index. Returns 404
  // unless ADMIN_TOKEN is configured; requires it to match.
  if (core.embeddingModel && core.vectorIndex && pathname === "/admin/seed-vectors") {
    if (!isAdminAuthorized(request, env.ADMIN_TOKEN)) {
      return new Response("Not found", { status: 404 });
    }
    const result = await seedPlanVectors({
      planRepository: core.planRepository,
      embeddingModel: core.embeddingModel,
      vectorIndex: core.vectorIndex,
    });
    return Response.json(result);
  }

  // One-off cleanup endpoint for businesses past their 90-day retention.
  // Returns 404 unless ADMIN_TOKEN is configured; requires it to match.
  if (pathname === "/admin/purge-expired-businesses") {
    if (!isAdminAuthorized(request, env.ADMIN_TOKEN)) {
      return new Response("Not found", { status: 404 });
    }

    if (core.mediaStorage === undefined) {
      return new Response("media storage is not configured", { status: 503 });
    }

    const purge = new PurgeExpiredBusinesses({
      businesses: core.directoryRepositories.business,
      media: core.directoryRepositories.media,
      storage: core.mediaStorage,
    });

    const result = await purge.execute(new Date());

    return Response.json(result);
  }

  // Idempotent station seed for the owned harness. Refuses to run without
  // STREAM_BASE_URL so a localhost URL never reaches a deployed database.
  if (pathname === "/admin/seed-stations") {
    if (!isAdminAuthorized(request, env.ADMIN_TOKEN)) {
      return new Response("Not found", { status: 404 });
    }

    if (!env.STREAM_BASE_URL) {
      return new Response("STREAM_BASE_URL is not configured", { status: 400 });
    }

    const stations = harnessStations(env.STREAM_BASE_URL);
    const writer = new D1StationCatalogWriter(env.aqui_suena_db);

    for (const station of stations) {
      await writer.upsert(station);
    }

    return Response.json({ seeded: stations.length });
  }

  // Idempotent plan-catalog seed. Returns 404 unless ADMIN_TOKEN is
  // configured; requires it to match.
  if (pathname === "/admin/seed-plans") {
    if (!isAdminAuthorized(request, env.ADMIN_TOKEN)) {
      return new Response("Not found", { status: 404 });
    }
    const seeded = await seedPlans(
      new D1PlanCatalogWriter(env.aqui_suena_db),
      DEFAULT_PLAN_CATALOG,
    );
    return Response.json({ seeded });
  }

  return undefined;
}
