import { ENTITLEMENTS } from "@aqui-suena/api/domain/plans/entitlements";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { createPlansRouter } from "@aqui-suena/api/server/routers/plans/plans";
import { describe, expect, it } from "vitest";

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
    const caller = router.createCaller({ user: null });

    const plans = await caller.list();

    expect(plans).toHaveLength(1);
    expect(plans[0]?.id).toBe("community");
  });

  it("rejects a malformed id with BAD_REQUEST", async () => {
    const caller = createPlansRouter(new InMemoryPlanRepository([])).createCaller({ user: null });

    await expect(caller.getById(123 as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects an unknown plan id with NOT_FOUND", async () => {
    const caller = createPlansRouter(new InMemoryPlanRepository([])).createCaller({ user: null });

    await expect(caller.getById("enterprise" as never)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects a known plan id that is not persisted with NOT_FOUND", async () => {
    const caller = createPlansRouter(new InMemoryPlanRepository([])).createCaller({ user: null });

    await expect(caller.getById("community")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
