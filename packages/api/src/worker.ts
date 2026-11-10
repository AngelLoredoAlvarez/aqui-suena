import type { PlanRepository } from "@aqui-suena/api/domain/billing/plans";
import {
  FullCatalogRetriever,
  seedPlanVectors,
  VectorPlanCatalogRetriever,
} from "@aqui-suena/api/domain/support/plan-catalog";
import { D1PlanRepository } from "@aqui-suena/api/infrastructure/billing/d1-plan-repository";
import { D1SubscriptionRepository } from "@aqui-suena/api/infrastructure/billing/d1-subscription-repository";
import { D1BusinessRepository } from "@aqui-suena/api/infrastructure/directory/d1-business-repository";
import { D1FlyerRepository } from "@aqui-suena/api/infrastructure/directory/d1-flyer-repository";
import { D1HourRepository } from "@aqui-suena/api/infrastructure/directory/d1-hour-repository";
import { D1PhotoRepository } from "@aqui-suena/api/infrastructure/directory/d1-photo-repository";
import { D1ProductRepository } from "@aqui-suena/api/infrastructure/directory/d1-product-repository";
import { D1ServiceRepository } from "@aqui-suena/api/infrastructure/directory/d1-service-repository";
import { D1WorkEntryRepository } from "@aqui-suena/api/infrastructure/directory/d1-work-entry-repository";
import { D1MediaRepository } from "@aqui-suena/api/infrastructure/media/d1-media-repository";
import { R2ObjectStorage } from "@aqui-suena/api/infrastructure/media/r2-client";
import { VectorizePlanVectorIndex } from "@aqui-suena/api/infrastructure/support/vectorize-plan-index";
import { WorkersAiEmbeddingModel } from "@aqui-suena/api/infrastructure/support/workers-ai-embedding-model";
import { parseAllowedOrigins } from "@aqui-suena/api/server/env";
import { createApp } from "@aqui-suena/api/server/http/app";
import type { AiBinding } from "@aqui-suena/api/server/routers/support";
import type { DirectoryRepositories } from "@aqui-suena/api/server/trpc/directory-repositories";

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
  /** R2 (S3-compatible) credentials for media storage. Optional: when absent, media uses an in-memory fake. */
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_ENDPOINT?: string;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const ai = env.AI as unknown as AiBinding;
    const gatewayId = env.AI_GATEWAY_ID;
    const embeddingModel =
      env.AI && env.PLAN_VECTORS
        ? new WorkersAiEmbeddingModel(env.AI as never, EMBEDDING_MODEL, gatewayId)
        : undefined;
    const vectorIndex = env.PLAN_VECTORS
      ? new VectorizePlanVectorIndex(env.PLAN_VECTORS)
      : undefined;

    const planRepository: PlanRepository = new D1PlanRepository(env.aqui_suena_db);
    const directoryRepositories: DirectoryRepositories = {
      business: new D1BusinessRepository(env.aqui_suena_db),
      service: new D1ServiceRepository(env.aqui_suena_db),
      product: new D1ProductRepository(env.aqui_suena_db),
      photo: new D1PhotoRepository(env.aqui_suena_db),
      workEntry: new D1WorkEntryRepository(env.aqui_suena_db),
      flyer: new D1FlyerRepository(env.aqui_suena_db),
      hour: new D1HourRepository(env.aqui_suena_db),
      subscription: new D1SubscriptionRepository(env.aqui_suena_db),
      media: new D1MediaRepository(env.aqui_suena_db),
    };

    const mediaStorage =
      env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY
        ? new R2ObjectStorage({
            accountId: env.R2_ACCOUNT_ID,
            accessKeyId: env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY,
            bucketName: env.R2_BUCKET_NAME ?? "aqui-suena-media",
            endpoint: env.R2_ENDPOINT,
          })
        : undefined;

    // One-off seeding endpoint for the Vectorize plan index. Returns 404
    // unless ADMIN_TOKEN is configured; requires it to match.
    if (embeddingModel && vectorIndex && new URL(request.url).pathname === "/admin/seed-vectors") {
      if (
        !env.ADMIN_TOKEN ||
        request.headers.get("authorization") !== `Bearer ${env.ADMIN_TOKEN}`
      ) {
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
      if (
        !env.ADMIN_TOKEN ||
        request.headers.get("authorization") !== `Bearer ${env.ADMIN_TOKEN}`
      ) {
        return new Response("Not found", { status: 404 });
      }
      const deleted = await directoryRepositories.business.deleteExpired(new Date());
      return Response.json({ deleted });
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
    });

    return app.fetch(request, env);
  },
};
