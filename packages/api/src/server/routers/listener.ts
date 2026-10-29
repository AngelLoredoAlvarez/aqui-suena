import {
  getMockListenerStatus,
  listenerStatusInput,
  listenerStatusOutput,
} from "@aqui-suena/api/listener";
import { publicProcedure, router } from "@aqui-suena/api/trpc";

export const listenerRouter = router({
  getStatus: publicProcedure
    .input(listenerStatusInput)
    .output(listenerStatusOutput)
    .query(({ input }) => getMockListenerStatus(input.stationId)),
});
