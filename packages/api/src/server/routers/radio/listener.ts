import { listenerStatusInput, listenerStatusOutput } from "@aqui-suena/api/domain/radio/listener";
import { simulatedListenerCount } from "@aqui-suena/api/domain/radio/simulated-listeners";
import type { StationRepository } from "@aqui-suena/api/domain/radio/station";
import { requireFound } from "@aqui-suena/api/server/trpc/errors";
import { publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";

export function createListenerRouter(stations: StationRepository) {
  return router({
    getStatus: publicProcedure
      .input(listenerStatusInput)
      .output(listenerStatusOutput)
      .query(async ({ input }) => {
        const station = requireFound(await stations.getById(input.stationId), "Station not found");
        const now = new Date();

        return {
          station: { id: station.id, name: station.name },
          activeUrl: station.streamUrl,
          listeners: simulatedListenerCount(station.id, now),
        };
      }),
  });
}
