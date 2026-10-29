import { describe, expect, it, vi } from "vitest";

import { fetchProxiedStream } from "./stream-proxy";

function upstreamOk(body = "audio-bytes", contentType = "audio/mpeg"): Response {
  return new Response(body, {
    status: 200,
    headers: { "content-type": contentType },
  });
}

describe("fetchProxiedStream", () => {
  it("proxies bytes for allowlisted mirror hosts", async () => {
    const upstreamFetch = vi.fn(async () => upstreamOk());

    const response = await fetchProxiedStream(
      upstreamFetch as unknown as typeof fetch,
      "https://ice1.somafm.com/groovesalad-128-mp3",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(await response.text()).toBe("audio-bytes");
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
  });

  it("rejects non-allowlisted hosts without touching the network", async () => {
    const upstreamFetch = vi.fn();

    const response = await fetchProxiedStream(
      upstreamFetch as unknown as typeof fetch,
      "https://evil.example.com/stream",
    );

    expect(response.status).toBe(403);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("rejects missing and malformed urls", async () => {
    const upstreamFetch = vi.fn();

    expect((await fetchProxiedStream(upstreamFetch as unknown as typeof fetch, null)).status).toBe(
      400,
    );
    expect(
      (await fetchProxiedStream(upstreamFetch as unknown as typeof fetch, "not-a-url")).status,
    ).toBe(400);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("maps upstream failures to bad gateway", async () => {
    const upstreamFetch = vi.fn(async () => new Response("nope", { status: 403 }));

    const response = await fetchProxiedStream(
      upstreamFetch as unknown as typeof fetch,
      "https://ice2.somafm.com/groovesalad-128-mp3",
    );

    expect(response.status).toBe(502);
  });
});
