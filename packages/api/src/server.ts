import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { handleRequest } from "./app";

export interface ApiServerOptions {
  allowedOrigins: readonly string[];
  // Injected for tests: the stream route must never reach the network there.
  upstreamFetch?: typeof fetch;
}

// Node bridge: adapts the portable `Request -> Response` handler to node:http,
// so `pnpm dev` keeps working while the exact same core runs in a Cloudflare
// Worker. The request body is buffered (tRPC bodies are small JSON); the
// response body is streamed via Readable.fromWeb so the /stream proxy never
// buffers audio.
export function createApiServer(options: ApiServerOptions): Server {
  return createServer((request, response) => {
    handleNodeRequest(request, response, options).catch((error: unknown) => {
      console.error("api: request failed", error);
      if (!response.headersSent) {
        response.writeHead(500, { "content-type": "text/plain" });
      }
      response.end("internal error");
    });
  });
}

async function handleNodeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: ApiServerOptions,
): Promise<void> {
  const webResponse = await handleRequest(await toRequest(request), options);
  await sendResponse(response, webResponse);
}

async function toRequest(request: IncomingMessage): Promise<Request> {
  const host = request.headers.host ?? "localhost";
  const url = new URL(request.url ?? "/", `http://${host}`);

  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }

  const method = request.method ?? "GET";
  const body = method === "GET" || method === "HEAD" ? undefined : await readBody(request);

  return new Request(url, { method, headers, body });
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

async function sendResponse(response: ServerResponse, webResponse: Response): Promise<void> {
  const headers: Record<string, string | string[]> = {};
  webResponse.headers.forEach((value, name) => {
    headers[name] = value;
  });
  response.writeHead(webResponse.status, headers);

  if (webResponse.body === null) {
    response.end();
    return;
  }

  const body = Readable.fromWeb(webResponse.body as ReadableStream);
  body.on("error", (error: unknown) => {
    console.error("api: stream interrupted", error);
    response.destroy();
  });
  body.pipe(response);
}
