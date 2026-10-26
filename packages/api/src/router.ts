import { adsRouter } from "./routers/ads";
import { listenerRouter } from "./routers/listener";
import { router } from "./trpc";

export const appRouter = router({
  ads: adsRouter,
  listener: listenerRouter,
});

export type AppRouter = typeof appRouter;
