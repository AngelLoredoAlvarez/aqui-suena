import {
  ACTIVE_LISTENER_WINDOW_MS,
  type ListenSessionRepository,
} from "@aqui-suena/api/domain/radio/listen-session";
import { listenerStatusInput, listenerStatusOutput } from "@aqui-suena/api/domain/radio/listener";
import type { StationRepository } from "@aqui-suena/api/domain/radio/station";
import { requireFound } from "@aqui-suena/api/server/trpc/errors";
import { publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";

export function createListenerRouter(
  stations: StationRepository,
  sessions: ListenSessionRepository,
) {
  return router({
    getStatus: publicProcedure
      .input(listenerStatusInput)
      .output(listenerStatusOutput)
      .query(async ({ input }) => {
        const station = requireFound(await stations.getById(input.stationId), "Station not found");
        const now = new Date();
        const listeners = await sessions.activeListeners(
          station.id,
          new Date(now.getTime() - ACTIVE_LISTENER_WINDOW_MS),
        );

        return {
          station: { id: station.id, name: station.name },
          activeUrl: station.streamUrl,
          listeners,
        };
      }),
  });
}
