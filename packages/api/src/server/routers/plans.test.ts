import { ENTITLEMENTS } from "@aqui-suena/api/domain/billing/entitlements";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/billing/plans";
import { describe, expect, it } from "vitest";
import { createPlansRouter } from "./plans";

describe("plans router", () => {
  it("lists plans from the repository", async () => {
    const repository = new InMemoryPlanRepository([
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
    ]);

    const router = createPlansRouter(repository);
    const caller = router.createCaller({});

    const plans = await caller.list();

    expect(plans).toHaveLength(1);
    expect(plans[0]?.id).toBe("community");
  });
});
