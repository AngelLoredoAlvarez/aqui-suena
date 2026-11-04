import * as v from "valibot";

// Client-safe module: valibot + pure mock only. This file (and ./client) must
// NEVER import @trpc/server — shared UI runs in browsers and React Native,
// where initTRPC.create() throws. The server router wraps these schemas.

export const listenerStatusInput = v.object({
  stationId: v.pipe(v.string(), v.minLength(1)),
});

export const listenerStatusOutput = v.object({
  station: v.object({
    id: v.string(),
    name: v.string(),
  }),
  activeUrl: v.pipe(v.string(), v.trim(), v.url()),
  listeners: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

export type ListenerStatus = v.InferOutput<typeof listenerStatusOutput>;

// Mock-first source: no live DB, no HTTP transport yet. Returns a fixed
// station with the requested id so the landing can render real states.
const MOCK_STATION_NAME = "Aquí Suena";
const MOCK_ACTIVE_URL = "https://stream.example.com/live";
const MOCK_LISTENERS = 42;

export function getMockListenerStatus(stationId: string): ListenerStatus {
  return v.parse(listenerStatusOutput, {
    station: { id: stationId, name: MOCK_STATION_NAME },
    activeUrl: MOCK_ACTIVE_URL,
    listeners: MOCK_LISTENERS,
  });
}
