import type { SubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/subscription-notifier";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
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
import { createPhotosRouter } from "@aqui-suena/api/server/routers/directory/photos";
import { createProductsRouter } from "@aqui-suena/api/server/routers/directory/products";
import { createServicesRouter } from "@aqui-suena/api/server/routers/directory/services";
import { createWorkEntriesRouter } from "@aqui-suena/api/server/routers/directory/work-entries";
import { createMediaRouter } from "@aqui-suena/api/server/routers/media/media";
import { createPlansRouter } from "@aqui-suena/api/server/routers/plans/plans";
import { listenerRouter } from "@aqui-suena/api/server/routers/radio/listener";
import { createSubscriptionsRouter } from "@aqui-suena/api/server/routers/subscriptions/subscriptions";
import { type AiBinding, createSupportRouter } from "@aqui-suena/api/server/routers/support";
import { router } from "@aqui-suena/api/server/trpc/trpc";

export function createAppRouter(
  planRepository: PlanRepository,
  directoryRepositories: DirectoryRepositories,
  ai: AiBinding | undefined,
  planCatalogRetriever: PlanCatalogRetriever | undefined,
  aiGatewayId: string | undefined,
  mediaStorage: ObjectStorage | undefined,
  subscriptionNotifier?: SubscriptionNotifier,
) {
  return router({
    ads: createCarouselRouter({
      businessRepository: directoryRepositories.business,
      flyerRepository: directoryRepositories.flyer,
      hourRepository: directoryRepositories.hour,
      subscriptionRepository: directoryRepositories.subscription,
    }),
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
    media: createMediaRouter(directoryRepositories.media, mediaStorage),
    photos: createPhotosRouter({
      photo: directoryRepositories.photo,
      business: directoryRepositories.business,
    }),
    products: createProductsRouter({
      product: directoryRepositories.product,
      business: directoryRepositories.business,
      subscription: directoryRepositories.subscription,
    }),
    services: createServicesRouter({
      service: directoryRepositories.service,
      business: directoryRepositories.business,
    }),
    subscriptions: createSubscriptionsRouter({
      subscription: directoryRepositories.subscription,
      plan: planRepository,
      account: directoryRepositories.account,
      notifier: subscriptionNotifier,
    }),
    workEntries: createWorkEntriesRouter({
      workEntry: directoryRepositories.workEntry,
      business: directoryRepositories.business,
    }),
    plans: createPlansRouter(planRepository),
    support: createSupportRouter(planRepository, ai, planCatalogRetriever, aiGatewayId),
  });
}

export const appRouter = createAppRouter(
  defaultPlanRepository,
  defaultDirectoryRepositories,
  undefined,
  undefined,
  undefined,
  undefined,
);

export type AppRouter = typeof appRouter;
