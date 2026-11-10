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
    .query(({ input }) => getMockListenerStatus(input.stationId)),
});
