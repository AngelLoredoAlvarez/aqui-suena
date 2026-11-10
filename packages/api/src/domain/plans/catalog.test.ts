import {
  DEFAULT_PLAN_CATALOG,
  type PlanCatalogWriter,
  seedPlans,
} from "@aqui-suena/api/domain/plans/catalog";
import { ENTITLEMENTS } from "@aqui-suena/api/domain/plans/entitlements";
import type { Plan } from "@aqui-suena/api/domain/plans/plans";
import { describe, expect, it } from "vitest";

describe("DEFAULT_PLAN_CATALOG", () => {
  it("is the single three-plan catalog", () => {
    expect(DEFAULT_PLAN_CATALOG.map((plan) => plan.id)).toEqual([
      "community",
      "trades",
      "commerce",
    ]);
  });

  it("references the entitlements matrix instead of duplicating limits", () => {
    expect(DEFAULT_PLAN_CATALOG[0]?.entitlements).toBe(ENTITLEMENTS.community);
    expect(DEFAULT_PLAN_CATALOG[1]?.entitlements).toBe(ENTITLEMENTS.trades);
    expect(DEFAULT_PLAN_CATALOG[2]?.entitlements).toBe(ENTITLEMENTS.commerce);
  });
});

describe("seedPlans", () => {
  function makeWriter() {
    const store = new Map<string, Plan>();
    const writer: PlanCatalogWriter = {
      async upsert(plan) {
        store.set(plan.id, plan);
      },
    };

    return { store, writer };
  }

  it("writes every plan in the catalog", async () => {
    const { store, writer } = makeWriter();

    const seeded = await seedPlans(writer, DEFAULT_PLAN_CATALOG);

    expect(seeded).toBe(DEFAULT_PLAN_CATALOG.length);
    expect([...store.keys()]).toEqual(["community", "trades", "commerce"]);
    expect(store.get("trades")?.priceMonthly).toBe(4900);
  });

  it("is idempotent when run twice", async () => {
    const { store, writer } = makeWriter();

    await seedPlans(writer, DEFAULT_PLAN_CATALOG);
    const seeded = await seedPlans(writer, DEFAULT_PLAN_CATALOG);

    expect(seeded).toBe(DEFAULT_PLAN_CATALOG.length);
    expect(store.size).toBe(DEFAULT_PLAN_CATALOG.length);
  });
});
