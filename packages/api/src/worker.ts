import { D1PlanRepository } from "./infrastructure/d1-plan-repository";
import { createApp } from "./server/app";
import { parseAllowedOrigins } from "./server/env";

export interface WorkerEnv {
  ALLOWED_ORIGINS?: string;
  aqui_suena_db: D1Database;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const app = createApp({
      allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
      planRepository: new D1PlanRepository(env.aqui_suena_db),
    });
    return app.fetch(request, env);
  },
};
