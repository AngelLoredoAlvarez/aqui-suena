import type { PlanRepository } from "@aqui-suena/api/domain/billing/plans";
import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import {
  FullCatalogRetriever,
  seedPlanVectors,
  VectorPlanCatalogRetriever,
} from "@aqui-suena/api/domain/support/plan-catalog";
import type { AiBinding } from "@aqui-suena/api/server/routers/support";
import { D1PlanRepository } from "./infrastructure/billing/d1-plan-repository";
import { D1BusinessRepository } from "./infrastructure/directory/d1-business-repository";
import { VectorizePlanVectorIndex } from "./infrastructure/support/vectorize-plan-index";
import { WorkersAiEmbeddingModel } from "./infrastructure/support/workers-ai-embedding-model";
import { createApp } from "./server/app";
import { parseAllowedOrigins } from "./server/env";

/** Embedding model for plan vectors; 1024 dimensions, multilingual (es/en). */
const EMBEDDING_MODEL = "@cf/baai/bge-m3";

/** How many plans to inject into the support prompt via vector search. */
const RETRIEVAL_TOP_K = 2;

export interface WorkerEnv {
  ALLOWED_ORIGINS?: string;
  aqui_suena_db: D1Database;
  AI: Ai;
  /** Set when the [[vectorize]] binding is enabled in wrangler.toml. */
  PLAN_VECTORS?: VectorizeIndex;
  /** Optional AI Gateway id; when set, Workers AI calls route through it. */
  AI_GATEWAY_ID?: string;
  /** Required to call POST /admin/seed-vectors. */
  ADMIN_TOKEN?: string;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const planRepository: PlanRepository = new D1PlanRepository(env.aqui_suena_db);
    const businessRepository: BusinessRepository = new D1BusinessRepository(env.aqui_suena_db);
    const ai = env.AI as unknown as AiBinding;
    const gatewayId = env.AI_GATEWAY_ID;
    const embeddingModel =
      env.AI && env.PLAN_VECTORS
        ? new WorkersAiEmbeddingModel(env.AI as never, EMBEDDING_MODEL, gatewayId)
        : undefined;
    const vectorIndex = env.PLAN_VECTORS
      ? new VectorizePlanVectorIndex(env.PLAN_VECTORS)
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
      planRepository,
      businessRepository,
      ai,
      planCatalogRetriever: retriever,
      aiGatewayId: gatewayId,
    });

    return app.fetch(request, env);
  },
};
