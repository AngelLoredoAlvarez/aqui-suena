import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The client entry must NEVER pull @trpc/server into its module graph:
// shared UI runs in browsers and React Native, where initTRPC.create()
// throws "non-server environment". If anyone adds a server import to the
// client entry later, this mock makes the suite fail.
vi.mock("@trpc/server", () => {
  throw new Error("@trpc/server must never load in the client entry");
});

import { fetchAdsCarousel, resolveApiBaseUrl } from "@aqui-suena/api/client";

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
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("loads and fetches status without the server module", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      makeTrpcResponse({
        station: { id: "test-pop", name: "Test Pop" },
        activeUrl: "http://localhost:3000/test-streams/test-pop.m4a",
        listeners: 0,
      }),
    ) as typeof fetch;

    const { getListenerStatus } = await import("@aqui-suena/api/client");
    const status = await getListenerStatus("test-pop", "https://api.example.com");

    expect(status.station.id).toBe("test-pop");
    expect(status.listeners).toBe(0);
  });

  it("throws on an HTTP error", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(makeTrpcResponse(null, false, 404)) as typeof fetch;

    const { getListenerStatus } = await import("@aqui-suena/api/client");

    await expect(getListenerStatus("test-pop", "https://api.example.com")).rejects.toThrow(
      /HTTP 404/,
    );
  });
});

describe("resolveApiBaseUrl", () => {
  const originalEnv = { ...process.env };
  const names = [
    "NEXT_PUBLIC_API_BASE_URL",
    "NEXT_PUBLIC_API_URL",
    "EXPO_PUBLIC_API_BASE_URL",
    "EXPO_PUBLIC_API_URL",
  ] as const;

  function clearApiEnv() {
    for (const name of names) delete process.env[name];
  }

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("prefers NEXT_PUBLIC_API_BASE_URL", () => {
    clearApiEnv();
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.com";
    process.env.NEXT_PUBLIC_API_URL = "https://legacy.example.com";

    expect(resolveApiBaseUrl()).toBe("https://api.example.com");
  });

  it("falls back to the legacy NEXT_PUBLIC_API_URL", () => {
    clearApiEnv();
    process.env.NEXT_PUBLIC_API_URL = "https://legacy.example.com";

    expect(resolveApiBaseUrl()).toBe("https://legacy.example.com");
  });

  it("falls back to EXPO_PUBLIC_API_BASE_URL for native bundles", () => {
    clearApiEnv();
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://expo.example.com";

    expect(resolveApiBaseUrl()).toBe("https://expo.example.com");
  });

  it("falls back to the legacy EXPO_PUBLIC_API_URL", () => {
    clearApiEnv();
    process.env.EXPO_PUBLIC_API_URL = "https://expo-legacy.example.com";

    expect(resolveApiBaseUrl()).toBe("https://expo-legacy.example.com");
  });

  it("returns empty string when no client base is set", () => {
    clearApiEnv();

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
