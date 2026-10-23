import { createApp } from "./app";
import { parseAllowedOrigins } from "./env";

export interface WorkerEnv {
  ALLOWED_ORIGINS?: string;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const app = createApp({ allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS) });
    return app.fetch(request, env);
  },
};
