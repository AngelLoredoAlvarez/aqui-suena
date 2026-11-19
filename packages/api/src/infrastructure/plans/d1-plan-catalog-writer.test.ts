import { DEFAULT_PLAN_CATALOG } from "@aqui-suena/api/domain/plans/catalog";
import { D1PlanCatalogWriter } from "@aqui-suena/api/infrastructure/plans/d1-plan-catalog-writer";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { normalizeSql } from "@aqui-suena/api/testing/sql";
import { describe, expect, it } from "vitest";

describe("D1PlanCatalogWriter", () => {
  it("emits an idempotent UPSERT with every plan field", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const plan = DEFAULT_PLAN_CATALOG[1];
    if (plan === undefined) throw new Error("catalog fixture missing");

    await new D1PlanCatalogWriter(fake.db).upsert(plan);

    const statement = fake.statements[0];

    expect(normalizeSql(statement?.sql)).toContain("INSERT INTO plans");
    expect(normalizeSql(statement?.sql)).toContain("ON CONFLICT(id) DO UPDATE");
    expect(normalizeSql(statement?.sql)).toContain("updated_at = excluded.updated_at");
    expect(statement?.params).toEqual([
      "trades",
      "Oficios & Servicios",
      plan.audience,
      plan.description,
      JSON.stringify(plan.benefits),
      9900,
      99000,
      "MXN",
      1,
      expect.any(Number),
      expect.any(Number),
    ]);
  });
});
