import { handleRequest } from "./app";
import { parseAllowedOrigins } from "./env";

export interface WorkerEnv {
  ALLOWED_ORIGINS?: string;
}

// Cloudflare Workers entry: the same portable core from app.ts, bound to the
// Worker environment. Deploy with `wrangler deploy` (see wrangler.toml). The
// Node process (main.ts) and this Worker share every route and the stream
// proxy — only the runtime entry differs.
export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return handleRequest(request, {
      allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
    });
  },
};
