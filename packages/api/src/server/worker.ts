import { DEFAULT_PLAN_CATALOG, seedPlans } from "@aqui-suena/api/domain/plans/catalog";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import {
  FullCatalogRetriever,
  seedPlanVectors,
  VectorPlanCatalogRetriever,
} from "@aqui-suena/api/domain/support/plan-catalog";
import { R2ObjectStorage } from "@aqui-suena/api/infrastructure/media/r2-client";
import { D1PlanCatalogWriter } from "@aqui-suena/api/infrastructure/plans/d1-plan-catalog-writer";
import { D1PlanRepository } from "@aqui-suena/api/infrastructure/plans/d1-plan-repository";
import { VectorizePlanVectorIndex } from "@aqui-suena/api/infrastructure/support/vectorize-plan-index";
import { WorkersAiEmbeddingModel } from "@aqui-suena/api/infrastructure/support/workers-ai-embedding-model";
import { createSubscriptionNotifier } from "@aqui-suena/api/server/composition/email";
import { createD1Repositories } from "@aqui-suena/api/server/composition/repositories";
import { parseAllowedOrigins } from "@aqui-suena/api/server/env";
import { isAdminAuthorized } from "@aqui-suena/api/server/http/admin-auth";
import { createApp } from "@aqui-suena/api/server/http/app";
import { withRequestLogging } from "@aqui-suena/api/server/http/observability";
import type { AiBinding } from "@aqui-suena/api/server/routers/support";

/** Embedding model for plan vectors; 1024 dimensions, multilingual (es/en). */
const EMBEDDING_MODEL = "@cf/baai/bge-m3";

/** How many plans to inject into the support prompt via vector search. */
const RETRIEVAL_TOP_K = 2;

export interface WorkerEnv {
  ALLOWED_ORIGINS?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_JWKS_URL?: string;
  aqui_suena_db: D1Database;
  AI: Ai;
  /** Set when the [[vectorize]] binding is enabled in wrangler.toml. */
  PLAN_VECTORS?: VectorizeIndex;
  /** Optional AI Gateway id; when set, Workers AI calls route through it. */
  AI_GATEWAY_ID?: string;
  /** Required to call POST /admin/seed-vectors. */
  ADMIN_TOKEN?: string;
  /**
   * R2 (S3-compatible) credentials for media storage. When all three are
   * absent media is reported as unconfigured; a partial set is a configuration
   * error (logged, still unconfigured). The Worker never uses a fake.
   */
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_ENDPOINT?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
}

export default {
  fetch: withRequestLogging(handleFetch),
};

async function handleFetch(request: Request, env: WorkerEnv): Promise<Response> {
  const ai = env.AI as unknown as AiBinding;

  const gatewayId = env.AI_GATEWAY_ID;

  const embeddingModel =
    env.AI && env.PLAN_VECTORS
      ? new WorkersAiEmbeddingModel(env.AI as never, EMBEDDING_MODEL, gatewayId)
      : undefined;

  const vectorIndex = env.PLAN_VECTORS ? new VectorizePlanVectorIndex(env.PLAN_VECTORS) : undefined;

  const planRepository: PlanRepository = new D1PlanRepository(env.aqui_suena_db);

  const directoryRepositories = createD1Repositories(env.aqui_suena_db);

  const r2Credentials = {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  };

  let mediaStorage: R2ObjectStorage | undefined;
  if (r2Credentials.accountId && r2Credentials.accessKeyId && r2Credentials.secretAccessKey) {
    mediaStorage = new R2ObjectStorage({
      accountId: r2Credentials.accountId,
      accessKeyId: r2Credentials.accessKeyId,
      secretAccessKey: r2Credentials.secretAccessKey,
      bucketName: env.R2_BUCKET_NAME ?? "aqui-suena-media",
      endpoint: env.R2_ENDPOINT,
    });
  } else if (Object.values(r2Credentials).some((value) => value !== undefined && value !== "")) {
    console.error(
      "worker: incomplete R2 configuration; media storage is unconfigured (set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY)",
    );
  }

  // One-off seeding endpoint for the Vectorize plan index. Returns 404
  // unless ADMIN_TOKEN is configured; requires it to match.
  if (embeddingModel && vectorIndex && new URL(request.url).pathname === "/admin/seed-vectors") {
    if (!isAdminAuthorized(request, env.ADMIN_TOKEN)) {
      return new Response("Not found", { status: 404 });
    }
    const result = await seedPlanVectors({
      planRepository,
      embeddingModel,
      vectorIndex,
    });
    return Response.json(result);
  }

  // One-off cleanup endpoint for businesses past their 90-day retention.
  // Returns 404 unless ADMIN_TOKEN is configured; requires it to match.
  if (new URL(request.url).pathname === "/admin/purge-expired-businesses") {
    if (!isAdminAuthorized(request, env.ADMIN_TOKEN)) {
      return new Response("Not found", { status: 404 });
    }
    const deleted = await directoryRepositories.business.deleteExpired(new Date());
    return Response.json({ deleted });
  }

  // Idempotent plan-catalog seed. Returns 404 unless ADMIN_TOKEN is
  // configured; requires it to match.
  if (new URL(request.url).pathname === "/admin/seed-plans") {
    if (!isAdminAuthorized(request, env.ADMIN_TOKEN)) {
      return new Response("Not found", { status: 404 });
    }
    const seeded = await seedPlans(
      new D1PlanCatalogWriter(env.aqui_suena_db),
      DEFAULT_PLAN_CATALOG,
    );
    return Response.json({ seeded });
  }

  const retriever =
    embeddingModel && vectorIndex
      ? new VectorPlanCatalogRetriever({
          planRepository,
          embeddingModel,
          vectorIndex,
          topK: RETRIEVAL_TOP_K,
        })
      : new FullCatalogRetriever(planRepository);

  const subscriptionNotifier = createSubscriptionNotifier(env.RESEND_API_KEY, env.RESEND_FROM);

  const app = createApp({
    allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
    supabaseUrl: env.SUPABASE_URL,
    supabaseAnonKey: env.SUPABASE_ANON_KEY ?? env.SUPABASE_PUBLISHABLE_KEY,
    supabaseSecretKey: env.SUPABASE_SECRET_KEY,
    supabaseJwksUrl: env.SUPABASE_JWKS_URL,
    planRepository,
    directoryRepositories,
    ai,
    planCatalogRetriever: retriever,
    aiGatewayId: gatewayId,
    mediaStorage,
    subscriptionNotifier,
    logRequests: false,
  });

  return app.fetch(request, env);
}
