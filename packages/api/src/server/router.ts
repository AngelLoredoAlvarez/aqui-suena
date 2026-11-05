import { ENTITLEMENTS } from "@aqui-suena/api/domain/billing/entitlements";
import { InMemoryPlanRepository, type PlanRepository } from "@aqui-suena/api/domain/billing/plans";
import type { PlanCatalogRetriever } from "@aqui-suena/api/domain/support/plan-catalog";
import { adsRouter } from "@aqui-suena/api/server/routers/ads";
import { businessRouter } from "@aqui-suena/api/server/routers/business";
import { createBusinessesRouter } from "@aqui-suena/api/server/routers/businesses";
import { createFlyersRouter } from "@aqui-suena/api/server/routers/flyers";
import { createHoursRouter } from "@aqui-suena/api/server/routers/hours";
import { listenerRouter } from "@aqui-suena/api/server/routers/listener";
import { createPhotosRouter } from "@aqui-suena/api/server/routers/photos";
import { createPlansRouter } from "@aqui-suena/api/server/routers/plans";
import { createProductsRouter } from "@aqui-suena/api/server/routers/products";
import { createServicesRouter } from "@aqui-suena/api/server/routers/services";
import { type AiBinding, createSupportRouter } from "@aqui-suena/api/server/routers/support";
import { createWorkEntriesRouter } from "@aqui-suena/api/server/routers/work-entries";
import { router } from "@aqui-suena/api/trpc";
import {
  createDefaultDirectoryRepositories,
  type DirectoryRepositories,
} from "./directory-repositories";

export function createAppRouter(
  planRepository: PlanRepository,
  directoryRepositories: DirectoryRepositories,
  ai?: AiBinding,
  planCatalogRetriever?: PlanCatalogRetriever,
  aiGatewayId?: string,
) {
  return router({
    ads: adsRouter,
    business: businessRouter,
    businesses: createBusinessesRouter(directoryRepositories.business),
    flyers: createFlyersRouter(directoryRepositories.flyer),
    hours: createHoursRouter(directoryRepositories.hour),
    listener: listenerRouter,
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
