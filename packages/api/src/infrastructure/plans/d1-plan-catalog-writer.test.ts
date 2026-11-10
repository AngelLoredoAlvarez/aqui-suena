import { DEFAULT_PLAN_CATALOG } from "@aqui-suena/api/domain/plans/catalog";
import { D1PlanCatalogWriter } from "@aqui-suena/api/infrastructure/plans/d1-plan-catalog-writer";
import { describe, expect, it } from "vitest";

function makeCapturingDb() {
  const state = { sql: "", params: [] as unknown[] };

  const db = {
    prepare: (sql: string) => {
      state.sql = sql;
      return {
        bind: (...params: unknown[]) => {
          state.params = params;
          return {
            run: async () => ({ success: true }),
          };
        },
      };
    },
  } as unknown as D1Database;

  return { db, state };
}

describe("D1PlanCatalogWriter", () => {
  it("emits an idempotent UPSERT with every plan field", async () => {
    const { db, state } = makeCapturingDb();
    const plan = DEFAULT_PLAN_CATALOG[1];
    if (plan === undefined) throw new Error("catalog fixture missing");

    await new D1PlanCatalogWriter(db).upsert(plan);

    expect(state.sql).toContain("INSERT INTO plans");
    expect(state.sql).toContain("ON CONFLICT(id) DO UPDATE");
    expect(state.sql).toContain("updated_at = excluded.updated_at");
    expect(state.params).toEqual([
      "trades",
      "Oficios & Servicios",
      plan.audience,
      plan.description,
      JSON.stringify(plan.benefits),
      4900,
      49000,
      "MXN",
      1,
      expect.any(Number),
      expect.any(Number),
    ]);
  });
});
