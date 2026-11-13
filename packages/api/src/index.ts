// Root entry: server-facing exports. Clients (web, desktop, mobile) must import
// the subpaths instead — `./client` or `./listener` — because this graph pulls
// in @trpc/server and, for the server pieces, node built-ins. Never re-export
// ./server, ./cors, ./env or ./main from here.
export type { ListenerStatus } from "@aqui-suena/api/domain/radio/listener";
export {
  getMockListenerStatus,
  listenerStatusInput,
  listenerStatusOutput,
} from "@aqui-suena/api/domain/radio/listener";
export type { AppRouter } from "@aqui-suena/api/server/trpc/router";
export { fetchProxiedStream } from "@aqui-suena/api/shared/stream-proxy";
