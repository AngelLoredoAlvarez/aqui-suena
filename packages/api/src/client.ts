import type { AdsCarouselItem } from "@aqui-suena/api/domain/radio/ads";
import {
  adsCarouselOutput,
  getAdsCarousel as getAdsCarouselCore,
} from "@aqui-suena/api/domain/radio/ads";
import type { ListenerStatus } from "@aqui-suena/api/domain/radio/listener";
import { getMockListenerStatus, listenerStatusInput } from "@aqui-suena/api/domain/radio/listener";
import * as v from "valibot";

export type { ListenerStatus } from "@aqui-suena/api/domain/radio/listener";
export { listenerStatusInput, listenerStatusOutput } from "@aqui-suena/api/domain/radio/listener";

// Re-exported here so Next.js route handlers can use the proxy core through
// the client-safe entry: stream-proxy has zero imports (no @trpc/server in
// its graph), so this keeps the client entry server-free (see client.test.ts
// guard) while satisfying the client-never-imports-server-entry rule.
export { fetchProxiedStream } from "@aqui-suena/api/server/http/stream-proxy";

// Client-safe fetcher for TanStack Query: validates the mock through the
// same valibot schemas the server router enforces, with no @trpc/server import
// anywhere in this module graph (see client.test.ts guard).
export async function getListenerStatus(stationId: string): Promise<ListenerStatus> {
  const { stationId: validId } = v.parse(listenerStatusInput, { stationId });
  return getMockListenerStatus(validId);
}

export async function getAdsCarousel(): Promise<AdsCarouselItem[]> {
  const items = getAdsCarouselCore();
  return v.parse(adsCarouselOutput, items);
}

export type { AdsCarouselItem } from "@aqui-suena/api/domain/radio/ads";
