import * as v from "valibot";

// Client-safe module: valibot + pure mock only. This file (and ./client) must
// NEVER import @trpc/server — shared UI runs in browsers and React Native,
// where initTRPC.create() throws. The server router wraps these schemas.

export const listenerStatusInput = v.object({
  stationId: v.pipe(v.string(), v.minLength(1)),
});

export const listenerStatusOutput = v.object({
  station: v.object({
    id: v.string(),
    name: v.string(),
  }),
  activeUrl: v.pipe(v.string(), v.trim(), v.url()),
  listeners: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

export type ListenerStatus = v.InferOutput<typeof listenerStatusOutput>;
