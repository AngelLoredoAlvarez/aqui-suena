import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { fetchProxiedStream } from "./client";
import { corsHeaders, preflightHeaders, resolveCors } from "./cors";
import { appRouter } from "./router";

const TRPC_PREFIX = "/trpc";
const STREAM_PATH = "/stream";
const HEALTH_PATH = "/health";

export interface ApiServerOptions {
  allowedOrigins: readonly string[];
  // Injected for tests: the stream route must never reach the network there.
  upstreamFetch?: typeof fetch;
}

export function createApiServer(options: ApiServerOptions): Server {
  const upstreamFetch = options.upstreamFetch ?? fetch;

  return createServer((request, response) => {
    handleRequest(request, response, options.allowedOrigins, upstreamFetch).catch(
      (error: unknown) => {
        console.error("api: request failed", error);
        if (!response.headersSent) {
          response.writeHead(500, { "content-type": "text/plain" });
        }
        response.end("internal error");
      },
    );
  });
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  allowedOrigins: readonly string[],
  upstreamFetch: typeof fetch,
): Promise<void> {
  const origin = request.headers.origin ?? null;
  const decision = resolveCors(origin, allowedOrigins);

  if (!decision.allowed) {
    response.writeHead(403, { vary: "Origin", "content-type": "text/plain" });
    response.end("forbidden origin");
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(
      204,
      decision.origin === null ? { vary: "Origin" } : preflightHeaders(decision.origin),
    );
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", "http://localhost");
  const cors = corsHeaders(decision.origin);

  if (url.pathname === HEALTH_PATH && request.method === "GET") {
    response.writeHead(200, { ...cors, "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (url.pathname === STREAM_PATH && request.method === "GET") {
    await handleStream(request, response, cors, upstreamFetch, url);
    return;
  }

  if (url.pathname === TRPC_PREFIX || url.pathname.startsWith(`${TRPC_PREFIX}/`)) {
    // The adapter writes its own status and headers; headers set here survive
    // writeHead and are only overridden on a name collision.
    for (const [name, value] of Object.entries(cors)) {
      response.setHeader(name, value);
    }

    await nodeHTTPRequestHandler({
      router: appRouter,
      req: request,
      res: response,
      path: url.pathname.slice(TRPC_PREFIX.length).replace(/^\//, ""),
      createContext: () => ({}),
    });
    return;
  }

  response.writeHead(404, { ...cors, "content-type": "text/plain" });
  response.end("not found");
}

async function handleStream(
  request: IncomingMessage,
  response: ServerResponse,
  cors: Record<string, string>,
  upstreamFetch: typeof fetch,
  url: URL,
): Promise<void> {
  const proxied = await fetchProxiedStream(upstreamFetch, url.searchParams.get("url"));

  for (const [name, value] of proxied.headers) {
    response.setHeader(name, value);
  }
  for (const [name, value] of Object.entries(cors)) {
    response.setHeader(name, value);
  }

  response.writeHead(proxied.status);

  if (proxied.body === null) {
    response.end();
    return;
  }

  // Audio is streamed, never buffered: the client starts playing while the
  // mirrors keep sending. A dropped client tears the upstream body down.
  const body = Readable.fromWeb(proxied.body);
  request.on("close", () => body.destroy());
  body.on("error", (error: unknown) => {
    console.error("api: stream interrupted", error);
    response.destroy();
  });
  body.pipe(response);
}
