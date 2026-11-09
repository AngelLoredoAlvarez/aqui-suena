import { ENTITLEMENTS } from "@aqui-suena/api/domain/billing/entitlements";
import { InMemoryPlanRepository, type PlanRepository } from "@aqui-suena/api/domain/billing/plans";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { FakeObjectStorage } from "@aqui-suena/api/domain/media/storage";
import type { PlanCatalogRetriever } from "@aqui-suena/api/domain/support/plan-catalog";
import { createPlansRouter } from "@aqui-suena/api/server/routers/billing/plans";
import { createCarouselRouter } from "@aqui-suena/api/server/routers/carousel";
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
import {
  createDefaultDirectoryRepositories,
  type DirectoryRepositories,
} from "@aqui-suena/api/server/trpc/directory-repositories";
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

export const defaultPlanRepository = new InMemoryPlanRepository([
  {
    id: "community",
    name: "Comunidad",
    audience: "Cualquier persona o negocio que quiera presencia básica y contacto directo.",
    description: "Anuncia tu negocio sin costo y forma parte del directorio de la región.",
    benefits: ["Contacto directo", "1 flyer básico"],
    priceMonthly: 0,
    priceAnnual: 0,
    currency: "MXN",
    active: true,
    entitlements: ENTITLEMENTS.community,
  },
  {
    id: "trades",
    name: "Oficios & Servicios",
    audience:
      "Prestadores de servicios profesionales o a domicilio: electricistas, plomeros, dentistas, abogados, educadores y más.",
    description:
      "Muestra tu experiencia y llega a más clientes con un perfil profesional para servicios.",
    benefits: ["Hasta 30 servicios", "Galería de trabajos", "Urgencias 24h"],
    priceMonthly: 4900,
    priceAnnual: 49000,
    currency: "MXN",
    active: true,
    entitlements: ENTITLEMENTS.trades,
  },
  {
    id: "commerce",
    name: "Comercios & Catálogo",
    audience:
      "Negocios establecidos que venden productos o catálogos: ferreterías, restaurantes, boutiques y más.",
    description:
      "Destaca con una vitrina digital completa para que los radioescuchas exploren todo lo que vendes.",
    benefits: ["Hasta 50 productos", "Catálogo por categorías", "Máxima prioridad"],
    priceMonthly: 9900,
    priceAnnual: 99000,
    currency: "MXN",
    active: true,
    entitlements: ENTITLEMENTS.commerce,
  },
]);

export const defaultDirectoryRepositories = createDefaultDirectoryRepositories();

export const appRouter = createAppRouter(defaultPlanRepository, defaultDirectoryRepositories);

export type AppRouter = typeof appRouter;
