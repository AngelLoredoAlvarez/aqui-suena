import { listenerRouter } from "./routers/listener";
import { router } from "./trpc";

export const appRouter = router({
  listener: listenerRouter,
});

export type AppRouter = typeof appRouter;
