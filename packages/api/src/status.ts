import { appRouter } from "./router";
import type { ListenerStatus } from "./routers/listener";

// Cross-platform fetcher for TanStack Query: calls the router directly
// (no HTTP transport yet) so web and native share the same states.
export async function getListenerStatus(stationId: string): Promise<ListenerStatus> {
  const caller = appRouter.createCaller({});
  return caller.listener.getStatus({ stationId });
}
