import { ENTITLEMENTS } from "@aqui-suena/api/domain/plans/entitlements";
import type { Plan } from "@aqui-suena/api/domain/plans/plans";

/**
 * Single source of plan names, prices, benefits and entitlements. The D1 seed
 * and the in-memory repository both read this constant, so they cannot drift.
 */
export const DEFAULT_PLAN_CATALOG: readonly Plan[] = [
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
];

/** Minimal write port for seeding the persisted plan catalog. */
export interface PlanCatalogWriter {
  upsert(plan: Plan): Promise<void>;
}

/**
 * Seeds every plan through the writer. Upserts are idempotent, so running this
 * twice leaves the same rows.
 */
export async function seedPlans(
  writer: PlanCatalogWriter,
  catalog: readonly Plan[],
): Promise<number> {
  for (const plan of catalog) {
    await writer.upsert(plan);
  }

  return catalog.length;
}
