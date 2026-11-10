import type { PlanRepository } from "@aqui-suena/api/domain/billing/plans";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { FakeObjectStorage } from "@aqui-suena/api/domain/media/storage";
import type { PlanCatalogRetriever } from "@aqui-suena/api/domain/support/plan-catalog";
import { defaultPlanRepository } from "@aqui-suena/api/server/composition/plans";
import {
  type DirectoryRepositories,
  defaultDirectoryRepositories,
} from "@aqui-suena/api/server/composition/repositories";
import { createCarouselRouter } from "@aqui-suena/api/server/routers/ads/carousel";
import { createPlansRouter } from "@aqui-suena/api/server/routers/billing/plans";
import { createBusinessesRouter } from "@aqui-suena/api/server/routers/directory/businesses";
import { createFlyersRouter } from "@aqui-suena/api/server/routers/directory/flyers";
import { createHoursRouter } from "@aqui-suena/api/server/routers/directory/hours";
import { businessRouter } from "@aqui-suena/api/server/routers/directory/listings";
import { createPhotosRouter } from "@aqui-suena/api/server/routers/directory/photos";
import { createProductsRouter } from "@aqui-suena/api/server/routers/directory/products";
import { createServicesRouter } from "@aqui-suena/api/server/routers/directory/services";
import { createWorkEntriesRouter } from "@aqui-suena/api/server/routers/directory/work-entries";
import { createMediaRouter } from "@aqui-suena/api/server/routers/media/media";
import { listenerRouter } from "@aqui-suena/api/server/routers/radio/listener";
import { type AiBinding, createSupportRouter } from "@aqui-suena/api/server/routers/support";
import { router } from "@aqui-suena/api/trpc";

export function createAppRouter(
  planRepository: PlanRepository,
  directoryRepositories: DirectoryRepositories,
  ai?: AiBinding,
  planCatalogRetriever?: PlanCatalogRetriever,
  aiGatewayId?: string,
  mediaStorage?: ObjectStorage,
) {
  return router({
    ads: createCarouselRouter({
      businessRepository: directoryRepositories.business,
      flyerRepository: directoryRepositories.flyer,
      hourRepository: directoryRepositories.hour,
      subscriptionRepository: directoryRepositories.subscription,
    }),
    business: businessRouter,
    businesses: createBusinessesRouter({
      business: directoryRepositories.business,
      subscription: directoryRepositories.subscription,
    }),
    flyers: createFlyersRouter(directoryRepositories.flyer),
    hours: createHoursRouter(directoryRepositories.hour),
    listener: listenerRouter,
    media: createMediaRouter(directoryRepositories.media, mediaStorage ?? new FakeObjectStorage()),
    photos: createPhotosRouter(directoryRepositories.photo),
    products: createProductsRouter(directoryRepositories.product),
    services: createServicesRouter(directoryRepositories.service),
    workEntries: createWorkEntriesRouter(directoryRepositories.workEntry),
    plans: createPlansRouter(planRepository),
    support: createSupportRouter(planRepository, ai, planCatalogRetriever, aiGatewayId),
  });
}

export const appRouter = createAppRouter(defaultPlanRepository, defaultDirectoryRepositories);

export type AppRouter = typeof appRouter;
