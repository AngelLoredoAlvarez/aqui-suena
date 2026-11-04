import type { AiBinding } from "@aqui-suena/api/server/routers/support";
import { D1PlanRepository } from "./infrastructure/billing/d1-plan-repository";
import { createApp } from "./server/app";
import { parseAllowedOrigins } from "./server/env";

export interface WorkerEnv {
  ALLOWED_ORIGINS?: string;
  aqui_suena_db: D1Database;
  AI: Ai;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const app = createApp({
      allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
      planRepository: new D1PlanRepository(env.aqui_suena_db),
      ai: env.AI as unknown as AiBinding,
    });

    return app.fetch(request, env);
  },
};
