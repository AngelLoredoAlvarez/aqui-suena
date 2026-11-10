import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { FakeObjectStorage } from "@aqui-suena/api/domain/media/storage";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import type { PlanCatalogRetriever } from "@aqui-suena/api/domain/support/plan-catalog";
import { defaultPlanRepository } from "@aqui-suena/api/server/composition/plans";
import {
  type DirectoryRepositories,
  defaultDirectoryRepositories,
} from "@aqui-suena/api/server/composition/repositories";
import { createCarouselRouter } from "@aqui-suena/api/server/routers/ads/carousel";
import { createBusinessesRouter } from "@aqui-suena/api/server/routers/directory/businesses";
import { createFlyersRouter } from "@aqui-suena/api/server/routers/directory/flyers";
import { createHoursRouter } from "@aqui-suena/api/server/routers/directory/hours";
import { createListingsRouter } from "@aqui-suena/api/server/routers/directory/listings";
import { createPhotosRouter } from "@aqui-suena/api/server/routers/directory/photos";
import { createProductsRouter } from "@aqui-suena/api/server/routers/directory/products";
import { createServicesRouter } from "@aqui-suena/api/server/routers/directory/services";
import { createWorkEntriesRouter } from "@aqui-suena/api/server/routers/directory/work-entries";
import { createMediaRouter } from "@aqui-suena/api/server/routers/media/media";
import { createPlansRouter } from "@aqui-suena/api/server/routers/plans/plans";
import { listenerRouter } from "@aqui-suena/api/server/routers/radio/listener";
import { type AiBinding, createSupportRouter } from "@aqui-suena/api/server/routers/support";
import { router } from "@aqui-suena/api/server/trpc/trpc";

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
    business: createListingsRouter(directoryRepositories.business),
    businesses: createBusinessesRouter({
      business: directoryRepositories.business,
      subscription: directoryRepositories.subscription,
    }),
    flyers: createFlyersRouter({
      flyer: directoryRepositories.flyer,
      business: directoryRepositories.business,
    }),
    hours: createHoursRouter({
      hour: directoryRepositories.hour,
      business: directoryRepositories.business,
    }),
    listener: listenerRouter,
    media: createMediaRouter(directoryRepositories.media, mediaStorage ?? new FakeObjectStorage()),
    photos: createPhotosRouter({
      photo: directoryRepositories.photo,
      business: directoryRepositories.business,
    }),
    products: createProductsRouter({
      product: directoryRepositories.product,
      business: directoryRepositories.business,
    }),
    services: createServicesRouter({
      service: directoryRepositories.service,
      business: directoryRepositories.business,
    }),
    workEntries: createWorkEntriesRouter({
      workEntry: directoryRepositories.workEntry,
      business: directoryRepositories.business,
    }),
    plans: createPlansRouter(planRepository),
    support: createSupportRouter(planRepository, ai, planCatalogRetriever, aiGatewayId),
  });
}

export const appRouter = createAppRouter(defaultPlanRepository, defaultDirectoryRepositories);

export type AppRouter = typeof appRouter;
