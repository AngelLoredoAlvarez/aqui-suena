import { getMockListenerStatus, listenerStatusInput, listenerStatusOutput } from "../listener";
import { publicProcedure, router } from "../trpc";

export const listenerRouter = router({
  getStatus: publicProcedure
    .input(listenerStatusInput)
    .output(listenerStatusOutput)
    .query(({ input }) => getMockListenerStatus(input.stationId)),
});
