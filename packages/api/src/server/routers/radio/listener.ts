import {
  getMockListenerStatus,
  listenerStatusInput,
  listenerStatusOutput,
} from "@aqui-suena/api/domain/radio/listener";
import { publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";

export const listenerRouter = router({
  getStatus: publicProcedure
    .input(listenerStatusInput)
    .output(listenerStatusOutput)
    .query(({ input }) => {
      // TODO(production): serves mock status (fixed stream URL, listeners: 42)
      // until listener counts and the active URL are read from persistence.
      return getMockListenerStatus(input.stationId);
    }),
});
