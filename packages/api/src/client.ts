import type { ListenerStatus } from "./listener";
import { getMockListenerStatus, listenerStatusInput } from "./listener";

export type { ListenerStatus } from "./listener";
export { listenerStatusInput, listenerStatusOutput } from "./listener";

// Client-safe fetcher for TanStack Query: validates the mock through the
// same zod schemas the server router enforces, with no @trpc/server import
// anywhere in this module graph (see client.test.ts guard).
export async function getListenerStatus(stationId: string): Promise<ListenerStatus> {
  const { stationId: validId } = listenerStatusInput.parse({ stationId });
  return getMockListenerStatus(validId);
}
