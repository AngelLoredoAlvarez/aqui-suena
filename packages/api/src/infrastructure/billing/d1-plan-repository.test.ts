import { ENTITLEMENTS } from "@aqui-suena/api/domain/billing/catalog/entitlements";

import { D1PlanRepository } from "@aqui-suena/api/infrastructure/billing/d1-plan-repository";
import { describe, expect, it } from "vitest";

describe("D1PlanRepository", () => {
  it("maps D1 rows into plans", async () => {
    const fakeDb = {
      prepare: () => ({
        all: async () => ({
          results: [
            {
              id: "community",
              name: "Comunidad",
              audience:
                "Cualquier persona o negocio que quiera presencia básica y contacto directo.",
              description:
                "Anuncia tu negocio sin costo y forma parte del directorio de la región.",
              benefits: JSON.stringify(["Contacto directo", "1 flyer básico"]),
              price_monthly: 0,
              price_annual: 0,
              currency: "MXN",
              active: 1,
            },
          ],
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1PlanRepository(fakeDb);
    const plans = await repository.list();

    expect(plans).toHaveLength(1);
    expect(plans[0]?.id).toBe("community");
    expect(plans[0]?.benefits).toEqual(["Contacto directo", "1 flyer básico"]);
    expect(plans[0]?.entitlements).toBe(ENTITLEMENTS.community);
  });
});
