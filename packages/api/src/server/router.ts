import { adsRouter } from "./routers/ads";
import { businessRouter } from "./routers/business";
import { listenerRouter } from "./routers/listener";
import { router } from "./trpc";

export const appRouter = router({
  ads: adsRouter,
  business: businessRouter,
  listener: listenerRouter,
});

export type AppRouter = typeof appRouter;
