// Root entry: server-facing exports. Clients (web, desktop, mobile) must import
// the subpaths instead — `./client` or `./listener` — because this graph pulls
// in @trpc/server and, for the server pieces, node built-ins. Never re-export
// ./server, ./cors, ./env or ./main from here.
export type { ListenerStatus } from "./domain/listener";
export {
  getMockListenerStatus,
  listenerStatusInput,
  listenerStatusOutput,
} from "./domain/listener";
export type { AppRouter } from "./server/router";
export { appRouter } from "./server/router";
export { fetchProxiedStream } from "./server/stream-proxy";
