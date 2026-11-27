import { ENTITLEMENTS } from "@aqui-suena/api/domain/plans/entitlements";
import type { Plan } from "@aqui-suena/api/domain/plans/plans";

const communityPlan: Plan = {
  id: "community",
  name: "Comunidad",
  audience: "Presencia básica.",
  description: "Sin costo.",
  benefits: ["Contacto directo"],
  priceMonthly: 0,
  priceAnnual: 0,
  currency: "MXN",
  active: true,
  entitlements: ENTITLEMENTS.community,
};

const tradesPlan: Plan = {
  id: "trades",
  name: "Oficios & Servicios",
  audience: "Servicios profesionales.",
  description: "Perfil profesional.",
  benefits: ["Hasta 30 servicios"],
  priceMonthly: 9900,
  priceAnnual: 99000,
  currency: "MXN",
  active: true,
  entitlements: ENTITLEMENTS.trades,
};

const commercePlan: Plan = {
  id: "commerce",
  name: "Comercios & Catálogo",
  audience: "Negocios establecidos.",
  description: "Vitrina digital.",
  benefits: ["Hasta 50 productos"],
  priceMonthly: 14900,
  priceAnnual: 149000,
  currency: "MXN",
  active: true,
  entitlements: ENTITLEMENTS.commerce,
};

export const plans = [communityPlan, tradesPlan, commercePlan];
