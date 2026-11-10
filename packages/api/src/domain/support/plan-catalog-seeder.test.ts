import type { Plan, PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { planDocument, seedPlanVectors } from "@aqui-suena/api/domain/support/plan-catalog";
import { describe, expect, it } from "vitest";

function makePlan(id: string): Plan {
  return {
    id: id as Plan["id"],
    name: `Plan ${id}`,
    audience: "electricistas y plomeros",
    description: "perfil profesional para servicios",
    benefits: ["Hasta 30 servicios", "Urgencias 24h"],
    priceMonthly: 4900,
    priceAnnual: 49000,
    currency: "MXN",
    active: true,
    entitlements: {} as Plan["entitlements"],
  };
}

describe("planDocument", () => {
  it("includes the searchable fields of the plan", () => {
    const doc = planDocument(makePlan("trades"));
    expect(doc).toContain("Plan trades");
    expect(doc).toContain("electricistas y plomeros");
    expect(doc).toContain("perfil profesional para servicios");
    expect(doc).toContain("Hasta 30 servicios");
    expect(doc).toContain("4900");
  });
});

describe("seedPlanVectors", () => {
  it("embeds one document per active plan and upserts id+vector pairs", async () => {
    const trades = makePlan("trades");
    const commerce = makePlan("commerce");
    const plans = [trades, commerce];
    const repository: PlanRepository = {
      async list() {
        return plans;
      },
      async getById() {
        return null;
      },
    };
    const embedCalls: string[][] = [];
    const upserts: { id: string; values: number[] }[][] = [];

    await seedPlanVectors({
      planRepository: repository,
      embeddingModel: {
        model: "test-model",
        async embed(texts) {
          embedCalls.push(texts);
          return texts.map((text) => [text.length]);
        },
      },
      vectorIndex: {
        async query() {
          return [];
        },
        async upsert(vectors) {
          upserts.push(vectors);
        },
      },
    });

    expect(embedCalls).toEqual([[planDocument(trades), planDocument(commerce)]]);
    expect(upserts).toEqual([
      [
        { id: "trades", values: [planDocument(trades).length] },
        { id: "commerce", values: [planDocument(commerce).length] },
      ],
    ]);
  });

  it("skips inactive plans", async () => {
    const active = makePlan("trades");
    const inactive = { ...makePlan("community"), active: false };
    const repository: PlanRepository = {
      async list() {
        return [active, inactive];
      },
      async getById() {
        return null;
      },
    };
    const embedCalls: string[][] = [];

    await seedPlanVectors({
      planRepository: repository,
      embeddingModel: {
        model: "test-model",
        async embed(texts) {
          embedCalls.push(texts);
          return texts.map(() => [0]);
        },
      },
      vectorIndex: {
        async query() {
          return [];
        },
        async upsert() {},
      },
    });

    expect(embedCalls).toEqual([[planDocument(active)]]);
  });
});
