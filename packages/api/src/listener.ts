import { z } from "zod";

// Client-safe module: zod + pure mock only. This file (and ./client) must
// NEVER import @trpc/server — shared UI runs in browsers and React Native,
// where initTRPC.create() throws. The server router wraps these schemas.

export const listenerStatusInput = z.object({
  stationId: z.string().min(1),
});

export const listenerStatusOutput = z.object({
  station: z.object({
    id: z.string(),
    name: z.string(),
  }),
  activeUrl: z.url(),
  listeners: z.number().int().nonnegative(),
});

export type ListenerStatus = z.infer<typeof listenerStatusOutput>;

// Mock-first source: no live DB, no HTTP transport yet. Returns a fixed
// station with the requested id so the landing can render real states.
const MOCK_STATION_NAME = "Aqui Suena";
const MOCK_ACTIVE_URL = "https://stream.example.com/live";
const MOCK_LISTENERS = 42;

export function getMockListenerStatus(stationId: string): ListenerStatus {
  return listenerStatusOutput.parse({
    station: { id: stationId, name: MOCK_STATION_NAME },
    activeUrl: MOCK_ACTIVE_URL,
    listeners: MOCK_LISTENERS,
  });
}
