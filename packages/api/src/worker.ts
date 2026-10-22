import { handleRequest } from "./app";
import { parseAllowedOrigins } from "./env";

export interface WorkerEnv {
  ALLOWED_ORIGINS?: string;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return handleRequest(request, {
      allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
    });
  },
};
