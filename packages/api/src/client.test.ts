import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The client entry must NEVER pull @trpc/server into its module graph:
// shared UI runs in browsers and React Native, where initTRPC.create()
// throws "non-server environment". If anyone adds a server import to the
// client entry later, this mock makes the suite fail.
vi.mock("@trpc/server", () => {
  throw new Error("@trpc/server must never load in the client entry");
});

import { fetchAdsCarousel, resolveApiBaseUrl } from "./client";

const VALID_ITEM = {
  id: "ad-1",
  imageUrl: "https://r2/flyer.png",
  alt: "Flyer de Casa Rosa",
  name: "Casa Rosa",
  category: "Comida",
  delivery: true,
  isOpen: true,
};

function makeTrpcResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => ({ result: { data } }),
  } as unknown as Response;
}

describe("client entry (non-server safe)", () => {
  it("loads and serves status without the server module", async () => {
    const { getListenerStatus } = await import("./client");
    const status = await getListenerStatus("placeholder-station");

    expect(status.station.id).toBe("placeholder-station");
    expect(status.listeners).toBeGreaterThanOrEqual(0);
  });
});

describe("resolveApiBaseUrl", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns NEXT_PUBLIC_API_URL when set", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";

    expect(resolveApiBaseUrl()).toBe("https://api.example.com");
  });

  it("falls back to EXPO_PUBLIC_API_URL when NEXT is unset", () => {
    delete process.env.NEXT_PUBLIC_API_URL;

    process.env.EXPO_PUBLIC_API_URL = "https://expo.example.com";

    expect(resolveApiBaseUrl()).toBe("https://expo.example.com");
  });

  it("returns empty string when neither is set", () => {
    delete process.env.NEXT_PUBLIC_API_URL;

    delete process.env.EXPO_PUBLIC_API_URL;

    expect(resolveApiBaseUrl()).toBe("");
  });
});

describe("fetchAdsCarousel", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns parsed items on success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeTrpcResponse([VALID_ITEM])) as typeof fetch;

    const result = await fetchAdsCarousel("https://api.example.com");

    expect(result).toEqual([VALID_ITEM]);
    expect(globalThis.fetch).toHaveBeenCalledWith("https://api.example.com/trpc/ads.carousel");
  });

  it("returns an empty array when the endpoint returns []", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeTrpcResponse([])) as typeof fetch;

    const result = await fetchAdsCarousel("https://api.example.com");

    expect(result).toEqual([]);
  });

  it("throws on HTTP error", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(makeTrpcResponse(null, false, 500)) as typeof fetch;

    await expect(fetchAdsCarousel("https://api.example.com")).rejects.toThrow(/HTTP 500/);
  });

  it("throws on invalid schema", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeTrpcResponse([{ id: "x" }])) as typeof fetch;

    await expect(fetchAdsCarousel("https://api.example.com")).rejects.toThrow();
  });

  it("throws on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down")) as typeof fetch;

    await expect(fetchAdsCarousel("https://api.example.com")).rejects.toThrow("network down");
  });
});
