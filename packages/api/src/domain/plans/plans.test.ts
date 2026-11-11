import { ENTITLEMENTS } from "@aqui-suena/api/domain/plans/entitlements";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { describe, expect, it } from "vitest";

describe("InMemoryPlanRepository", () => {
  it("returns all seeded plans", async () => {
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

    const plans = await repository.list();

    expect(plans).toHaveLength(1);
    expect(plans[0]?.id).toBe("community");
  });

  it("returns a plan by id", async () => {
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

    const plan = await repository.getById("community");

    expect(plan?.id).toBe("community");
  });

  it("returns null for an unknown plan", async () => {
    const repository = new InMemoryPlanRepository([]);

    const plan = await repository.getById("trades");

    expect(plan).toBeNull();
  });
});
