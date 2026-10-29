import { createAdaptorServer, type ServerType } from "@hono/node-server";
import { type AppOptions, createApp } from "./app";

export type ApiServerOptions = AppOptions;

// Hono runs on Web Standards; the Node dev process adapts it to node:http so
// `main.ts` keeps a plain listen/close lifecycle (and tests keep using it).
export function createApiServer(options: ApiServerOptions): ServerType {
  return createAdaptorServer(createApp(options));
}
