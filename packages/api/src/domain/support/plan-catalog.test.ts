import type { Plan, PlanRepository } from "@aqui-suena/api/domain/billing/plans";
import {
  FullCatalogRetriever,
  VectorPlanCatalogRetriever,
} from "@aqui-suena/api/domain/support/plan-catalog";
import { describe, expect, it } from "vitest";

function makePlan(id: string): Plan {
  return {
    id: id as Plan["id"],
    name: `Plan ${id}`,
    audience: "audience",
    description: "description",
    benefits: ["benefit"],
    priceMonthly: 0,
    priceAnnual: 0,
    currency: "MXN",
    active: true,
    entitlements: {} as Plan["entitlements"],
  };
}

const PLANS = [makePlan("community"), makePlan("trades"), makePlan("commerce")];

function makeRepository(plans: Plan[]): PlanRepository {
  return {
    async list() {
      return plans;
    },
    async getById(id) {
      return plans.find((plan) => plan.id === id) ?? null;
    },
  };
}

// ---------------------------------------------------------------------------
// Fakes (capture calls, like the D1 repository tests)
// ---------------------------------------------------------------------------

type EmbeddingCall = { texts: string[] };

function makeEmbeddingModel(vector: number[], calls: EmbeddingCall[]) {
  return {
    model: "@cf/baai/bge-m3",
    async embed(texts: string[]) {
      calls.push({ texts });
      return texts.map(() => vector);
    },
  };
}

type QueryCall = { vector: number[]; topK: number };

function makeVectorIndex(matches: { id: string; score: number }[], calls: QueryCall[]) {
  return {
    async query(vector: number[], topK: number) {
      calls.push({ vector, topK });
      return matches;
    },
    async upsert() {},
  };
}

// ---------------------------------------------------------------------------
// FullCatalogRetriever
// ---------------------------------------------------------------------------

describe("FullCatalogRetriever", () => {
  it("returns every plan from the repository", async () => {
    const retriever = new FullCatalogRetriever(makeRepository(PLANS));
    const result = await retriever.retrieve("any question");
    expect(result).toEqual(PLANS);
  });
});

// ---------------------------------------------------------------------------
// VectorPlanCatalogRetriever
// ---------------------------------------------------------------------------

describe("VectorPlanCatalogRetriever", () => {
  it("embeds the query, queries the index, and maps matches to plans in score order", async () => {
    const embeddingCalls: EmbeddingCall[] = [];
    const queryCalls: QueryCall[] = [];
    const retriever = new VectorPlanCatalogRetriever({
      planRepository: makeRepository(PLANS),
      embeddingModel: makeEmbeddingModel([0.1, 0.2, 0.3], embeddingCalls),
      vectorIndex: makeVectorIndex(
        [
          { id: "commerce", score: 0.42 },
          { id: "trades", score: 0.9 },
        ],
        queryCalls,
      ),
      topK: 2,
    });

    const result = await retriever.retrieve("quiero mostrar mi catálogo");

    expect(embeddingCalls).toEqual([{ texts: ["quiero mostrar mi catálogo"] }]);
    expect(queryCalls).toEqual([{ vector: [0.1, 0.2, 0.3], topK: 2 }]);
    expect(result).toEqual([PLANS[1], PLANS[2]]); // higher score first (0.9 trades, 0.42 commerce)
  });

  it("skips matches whose id is not a known plan", async () => {
    const retriever = new VectorPlanCatalogRetriever({
      planRepository: makeRepository(PLANS),
      embeddingModel: makeEmbeddingModel([1], []),
      vectorIndex: makeVectorIndex(
        [
          { id: "trades", score: 0.8 },
          { id: "unknown-plan", score: 0.95 },
        ],
        [],
      ),
      topK: 5,
    });

    const result = await retriever.retrieve("urgencias 24h");
    expect(result).toEqual([PLANS[1]]);
  });

  it("falls back to the full catalog when the index returns no matches", async () => {
    const retriever = new VectorPlanCatalogRetriever({
      planRepository: makeRepository(PLANS),
      embeddingModel: makeEmbeddingModel([1], []),
      vectorIndex: makeVectorIndex([], []),
      topK: 3,
    });

    const result = await retriever.retrieve("algo raro");
    expect(result).toEqual(PLANS);
  });

  it("falls back to the full catalog when the embedding model fails", async () => {
    const retriever = new VectorPlanCatalogRetriever({
      planRepository: makeRepository(PLANS),
      embeddingModel: {
        model: "x",
        async embed() {
          throw new Error("embedding down");
        },
      },
      vectorIndex: makeVectorIndex([{ id: "trades", score: 1 }], []),
      topK: 3,
    });

    const result = await retriever.retrieve("hola");
    expect(result).toEqual(PLANS);
  });

  it("falls back to the full catalog when the vector index fails", async () => {
    const retriever = new VectorPlanCatalogRetriever({
      planRepository: makeRepository(PLANS),
      embeddingModel: makeEmbeddingModel([1], []),
      vectorIndex: {
        async query() {
          throw new Error("index down");
        },
        async upsert() {},
      },
      topK: 3,
    });

    const result = await retriever.retrieve("hola");
    expect(result).toEqual(PLANS);
  });
});
