import { DEFAULT_PLAN_CATALOG } from "@aqui-suena/api/domain/plans/catalog";
import { defaultPlanRepository } from "@aqui-suena/api/server/composition/plans";
import { describe, expect, it } from "vitest";

describe("defaultPlanRepository", () => {
  it("serves the same catalog the D1 seed writes", async () => {
    const plans = await defaultPlanRepository.list();

    expect(plans.map((plan) => plan.id)).toEqual(DEFAULT_PLAN_CATALOG.map((plan) => plan.id));

    for (const [index, plan] of plans.entries()) {
      const expected = DEFAULT_PLAN_CATALOG[index];
      expect(expected).toBeDefined();
      expect(plan.name).toBe(expected?.name);
      expect(plan.priceMonthly).toBe(expected?.priceMonthly);
      expect(plan.priceAnnual).toBe(expected?.priceAnnual);
      expect(plan.benefits).toEqual(expected?.benefits);
      expect(plan.entitlements).toBe(expected?.entitlements);
    }
  });
});
