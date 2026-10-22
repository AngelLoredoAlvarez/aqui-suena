import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { corsHeaders, preflightHeaders, resolveCors } from "./cors";
import { appRouter } from "./router";
import { fetchProxiedStream } from "./stream-proxy";

const TRPC_PREFIX = "/trpc";
const HEALTH_PATH = "/health";
const STREAM_PATH = "/stream";

export interface AppOptions {
  allowedOrigins: readonly string[];
  // Injected for tests: the stream route must never reach the network there.
  upstreamFetch?: typeof fetch;
}

// Portable request handler: a pure `Request -> Response` function with no
// node built-ins, so the same core serves the Node process (via the bridge in
// server.ts) and a Cloudflare Worker (worker.ts). CORS is a browser mechanism,
// not authentication, so the policy is enforced here exactly as it was in the
// node:http server.
export async function handleRequest(request: Request, options: AppOptions): Promise<Response> {
  const upstreamFetch = options.upstreamFetch ?? fetch;
  const origin = request.headers.get("origin");
  const decision = resolveCors(origin, options.allowedOrigins);

  if (!decision.allowed) {
    return new Response("forbidden origin", {
      status: 403,
      headers: { vary: "Origin", "content-type": "text/plain" },
    });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: decision.origin === null ? { vary: "Origin" } : preflightHeaders(decision.origin),
    });
  }

  const url = new URL(request.url);
  const cors = corsHeaders(decision.origin);

  if (url.pathname === HEALTH_PATH && request.method === "GET") {
    return Response.json({ status: "ok" }, { headers: cors });
  }

  if (url.pathname === STREAM_PATH && request.method === "GET") {
    const proxied = await fetchProxiedStream(upstreamFetch, url.searchParams.get("url"));
    return withCors(proxied, cors);
  }

  if (url.pathname === TRPC_PREFIX || url.pathname.startsWith(`${TRPC_PREFIX}/`)) {
    const response = await fetchRequestHandler({
      endpoint: TRPC_PREFIX,
      req: request,
      router: appRouter,
      createContext: () => ({}),
    });
    return withCors(response, cors);
  }

  return new Response("not found", {
    status: 404,
    headers: { ...cors, "content-type": "text/plain" },
  });
}

// A `Response` is immutable once constructed, so the proxied stream and the
// tRPC response are re-wrapped to carry the CORS headers. The body is passed
// through untouched, so streaming is preserved (bytes pipe, never buffer).
function withCors(response: Response, cors: Record<string, string>): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(cors)) {
    headers.set(name, value);
  }
  return new Response(response.body, { status: response.status, headers });
}
