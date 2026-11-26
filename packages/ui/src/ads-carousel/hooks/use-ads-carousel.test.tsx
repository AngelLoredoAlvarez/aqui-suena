// @vitest-environment jsdom

import { useAdsCarousel } from "@aqui-suena/ui/ads-carousel/hooks/use-ads-carousel";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClient = vi.hoisted(() => ({
  fetchAdsCarousel: vi.fn(),
  resolveApiBaseUrl: vi.fn(),
}));

vi.mock("@aqui-suena/api/client", () => ({
  fetchAdsCarousel: apiClient.fetchAdsCarousel,
  resolveApiBaseUrl: apiClient.resolveApiBaseUrl,
}));

function renderAdsCarouselHook(queryClient: QueryClient) {
  return renderHook(() => useAdsCarousel(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

describe("useAdsCarousel", () => {
  beforeEach(() => {
    apiClient.fetchAdsCarousel.mockReset();
    apiClient.resolveApiBaseUrl.mockReset();
    apiClient.resolveApiBaseUrl.mockReturnValue("https://api.example.com");
    apiClient.fetchAdsCarousel.mockResolvedValue([]);
  });

  it("keys the query as ads-carousel", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderAdsCarouselHook(queryClient);

    expect(queryClient.getQueryState(["ads-carousel"])).toBeDefined();
  });

  it("resolves the base url and fetches through fetchAdsCarousel", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderAdsCarouselHook(queryClient);

    await waitFor(() => expect(apiClient.fetchAdsCarousel).toHaveBeenCalled());

    expect(apiClient.resolveApiBaseUrl).toHaveBeenCalledOnce();
    expect(apiClient.fetchAdsCarousel).toHaveBeenCalledWith("https://api.example.com");
  });

  it("exposes the fetched items as query data", async () => {
    const items = [
      {
        id: "a",
        imageUrl: "https://example.com/a.png",
        alt: "Ad A",
        name: "Casa Rosa",
        category: "food",
        delivery: true,
        isOpen: true,
      },
    ];
    apiClient.fetchAdsCarousel.mockResolvedValue(items);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderAdsCarouselHook(queryClient);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(items);
  });
});
