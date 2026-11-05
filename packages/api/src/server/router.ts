import { ENTITLEMENTS } from "@aqui-suena/api/domain/billing/entitlements";
import { InMemoryPlanRepository, type PlanRepository } from "@aqui-suena/api/domain/billing/plans";
import {
  type BusinessRepository,
  InMemoryBusinessRepository,
} from "@aqui-suena/api/domain/directory/business";
import type { PlanCatalogRetriever } from "@aqui-suena/api/domain/support/plan-catalog";
import { adsRouter } from "@aqui-suena/api/server/routers/ads";
import { businessRouter } from "@aqui-suena/api/server/routers/business";
import { createBusinessesRouter } from "@aqui-suena/api/server/routers/businesses";
import { listenerRouter } from "@aqui-suena/api/server/routers/listener";
import { createPlansRouter } from "@aqui-suena/api/server/routers/plans";
import { type AiBinding, createSupportRouter } from "@aqui-suena/api/server/routers/support";
import { router } from "@aqui-suena/api/trpc";

export function createAppRouter(
  planRepository: PlanRepository,
  businessRepository: BusinessRepository,
  ai?: AiBinding,
  planCatalogRetriever?: PlanCatalogRetriever,
  aiGatewayId?: string,
) {
  return router({
    ads: adsRouter,
    business: businessRouter,
    businesses: createBusinessesRouter(businessRepository),
    listener: listenerRouter,
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

export const defaultBusinessRepository = new InMemoryBusinessRepository([]);

export const appRouter = createAppRouter(defaultPlanRepository, defaultBusinessRepository);

export type AppRouter = typeof appRouter;
