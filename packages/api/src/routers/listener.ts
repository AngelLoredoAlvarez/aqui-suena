import { z } from "zod";

import { publicProcedure, router } from "../trpc";

export const listenerStatusInput = z.object({
  stationId: z.string().min(1),
});

export const listenerStatusOutput = z.object({
  station: z.object({
    id: z.string(),
    name: z.string(),
  }),
  activeUrl: z.string().url(),
  listeners: z.number().int().nonnegative(),
});

export type ListenerStatus = z.infer<typeof listenerStatusOutput>;

// Mock-first source: no live DB, no HTTP transport yet. Returns a fixed
// station with the requested id so the landing can render real states.
const MOCK_STATION_NAME = "Aqui Suena";
const MOCK_ACTIVE_URL = "https://stream.example.com/live";
const MOCK_LISTENERS = 42;

export const listenerRouter = router({
  getStatus: publicProcedure
    .input(listenerStatusInput)
    .output(listenerStatusOutput)
    .query(({ input }) => ({
      station: { id: input.stationId, name: MOCK_STATION_NAME },
      activeUrl: MOCK_ACTIVE_URL,
      listeners: MOCK_LISTENERS,
    })),
});
