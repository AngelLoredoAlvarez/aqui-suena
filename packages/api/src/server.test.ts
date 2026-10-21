import { request as httpRequest } from "node:http";
import type { AddressInfo } from "node:net";
import { createTRPCClient, httpLink } from "@trpc/client";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_ALLOWED_ORIGINS } from "./cors";
import type { AppRouter } from "./router";
import { createApiServer } from "./server";

interface RawResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

interface StartedServer {
  url: string;
  close: () => Promise<void>;
}

const running: Array<() => Promise<void>> = [];

async function startServer(upstreamFetch?: typeof fetch): Promise<StartedServer> {
  const server = createApiServer({ allowedOrigins: DEFAULT_ALLOWED_ORIGINS, upstreamFetch });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  const close = () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  running.push(close);
  return { url: `http://127.0.0.1:${address.port}`, close };
}

function rawRequest(
  url: string,
  options: { method?: string; origin?: string } = {},
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      url,
      {
        method: options.method ?? "GET",
        headers: options.origin === undefined ? undefined : { origin: options.origin },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    request.on("error", reject);
    request.end();
  });
}

afterEach(async () => {
  await Promise.all(running.splice(0).map((close) => close()));
});

describe("GET /health", () => {
  it("reports ok for a deploy probe", async () => {
    const { url } = await startServer();
    const response = await rawRequest(`${url}/health`);

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: "ok" });
  });

  it("accepts a call without an Origin header, which is how mobile calls the API", async () => {
    const { url } = await startServer();
    const response = await rawRequest(`${url}/health`);

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it.each(["http://localhost:3000", "tauri://localhost", "http://tauri.localhost"])(
    "echoes the allowed platform origin %s",
    async (origin) => {
      const { url } = await startServer();
      const response = await rawRequest(`${url}/health`, { origin });

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBe(origin);
      expect(response.headers.vary).toBe("Origin");
    },
  );

  it("refuses an origin that is not on the allowlist", async () => {
    const { url } = await startServer();
    const response = await rawRequest(`${url}/health`, { origin: "http://evil.example" });

    expect(response.status).toBe(403);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("OPTIONS preflight", () => {
  it("answers an allowed origin with the methods and headers a browser needs", async () => {
    const { url } = await startServer();
    const response = await rawRequest(`${url}/trpc/listener.getStatus`, {
      method: "OPTIONS",
      origin: "http://tauri.localhost",
    });

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://tauri.localhost");
    expect(response.headers["access-control-allow-methods"]).toBe("GET,POST,OPTIONS");
    expect(response.headers["access-control-allow-headers"]).toBe("content-type,authorization");
    expect(response.headers["access-control-max-age"]).toBe("600");
  });

  it("refuses a preflight from a foreign origin", async () => {
    const { url } = await startServer();
    const response = await rawRequest(`${url}/trpc/listener.getStatus`, {
      method: "OPTIONS",
      origin: "http://evil.example",
    });

    expect(response.status).toBe(403);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("/trpc", () => {
  it("serves the shared appRouter to a real tRPC client", async () => {
    const { url } = await startServer();
    const client = createTRPCClient<AppRouter>({ links: [httpLink({ url: `${url}/trpc` })] });

    const status = await client.listener.getStatus.query({ stationId: "station-1" });

    expect(status.station).toEqual({ id: "station-1", name: "Aquí Suena" });
    expect(status.listeners).toBe(42);
  });

  it("applies the origin policy to tRPC as well", async () => {
    const { url } = await startServer();
    const response = await rawRequest(`${url}/trpc/listener.getStatus`, {
      origin: "http://evil.example",
    });

    expect(response.status).toBe(403);
  });
});

describe("GET /stream", () => {
  it("rejects a request without a url", async () => {
    const { url } = await startServer();
    const response = await rawRequest(`${url}/stream`);

    expect(response.status).toBe(400);
  });

  it("rejects a host outside the allowlist", async () => {
    const upstreamFetch = () => Promise.reject(new Error("upstream must not be called"));
    const { url } = await startServer(upstreamFetch);
    const response = await rawRequest(
      `${url}/stream?url=${encodeURIComponent("https://evil.example/live")}`,
    );

    expect(response.status).toBe(403);
  });

  it("streams the proxied body to a desktop client", async () => {
    const upstreamFetch = () =>
      Promise.resolve(
        new Response("audio-bytes", {
          status: 200,
          headers: { "content-type": "audio/mpeg" },
        }),
      );
    const { url } = await startServer(upstreamFetch);
    const response = await rawRequest(
      `${url}/stream?url=${encodeURIComponent("https://ice1.somafm.com/groovesalad-128-mp3")}`,
      { origin: "tauri://localhost" },
    );

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("audio/mpeg");
    expect(response.headers["accept-ranges"]).toBe("bytes");
    expect(response.headers["access-control-allow-origin"]).toBe("tauri://localhost");
    expect(response.body).toBe("audio-bytes");
  });

  it("refuses a foreign origin before proxying anything", async () => {
    const upstreamFetch = () => Promise.reject(new Error("upstream must not be called"));
    const { url } = await startServer(upstreamFetch);
    const response = await rawRequest(
      `${url}/stream?url=${encodeURIComponent("https://ice1.somafm.com/groovesalad-128-mp3")}`,
      { origin: "http://evil.example" },
    );

    expect(response.status).toBe(403);
  });
});

describe("unknown paths", () => {
  it("returns 404", async () => {
    const { url } = await startServer();
    const response = await rawRequest(`${url}/nope`);

    expect(response.status).toBe(404);
  });
});
