import type { AdsCarouselItem } from "@aqui-suena/api/domain/ads/contract";
import { adsCarouselOutput } from "@aqui-suena/api/domain/ads/contract";
import type { ListenerStatus } from "@aqui-suena/api/domain/radio/listener";
import { listenerStatusInput, listenerStatusOutput } from "@aqui-suena/api/domain/radio/listener";
import * as v from "valibot";

export type { ListenerStatus } from "@aqui-suena/api/domain/radio/listener";
export { listenerStatusInput, listenerStatusOutput } from "@aqui-suena/api/domain/radio/listener";

// Re-exported here so Next.js route handlers can use the proxy core through
// the client-safe entry: stream-proxy has zero imports (no @trpc/server in
// its graph), so this keeps the client entry server-free (see client.test.ts
// guard) while satisfying the client-never-imports-server-entry rule.
export { fetchProxiedStream } from "@aqui-suena/api/shared/stream-proxy";

// Client-safe fetcher for TanStack Query: calls the tRPC endpoint over HTTP and
// validates the response with the shared schema, with no @trpc/server import
// anywhere in this module graph (see client.test.ts guard).
export async function getListenerStatus(
  stationId: string,
  baseUrl?: string,
): Promise<ListenerStatus> {
  const { stationId: validId } = v.parse(listenerStatusInput, { stationId });
  const base = baseUrl ?? resolveApiBaseUrl();
  const input = encodeURIComponent(JSON.stringify({ stationId: validId }));
  const response = await fetch(`${base}/trpc/listener.getStatus?input=${input}`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const json = (await response.json()) as { result?: { data?: unknown } };

  return v.parse(listenerStatusOutput, json?.result?.data);
}

// Resolves the API base URL from environment variables. Returns "" when
// neither is set, which makes the fetch same-origin (web default).
export function resolveApiBaseUrl(): string {
  if (typeof process !== "undefined" && process.env) {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  }

  return "";
}

// Client-safe fetcher for the ads carousel. Calls the tRPC endpoint and
// validates the response with the shared valibot schema. Throws on HTTP,
// network, or schema errors so the caller (TanStack Query) can retry/show
// an error state. No seed fallback: the endpoint is the source of truth.
export async function fetchAdsCarousel(baseUrl?: string): Promise<AdsCarouselItem[]> {
  const base = baseUrl ?? resolveApiBaseUrl();
  const response = await fetch(`${base}/trpc/ads.carousel`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const json = (await response.json()) as { result?: { data?: unknown } };
  const items = json?.result?.data;

  return v.parse(adsCarouselOutput, items);
}

export type { AdsCarouselItem } from "@aqui-suena/api/domain/ads/contract";
