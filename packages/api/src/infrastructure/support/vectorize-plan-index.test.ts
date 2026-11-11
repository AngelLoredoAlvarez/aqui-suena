import { VectorizePlanVectorIndex } from "@aqui-suena/api/infrastructure/support/vectorize-plan-index";
import { describe, expect, it } from "vitest";

function makeIndex(
  calls: { vector: number[]; options: unknown }[],
  response: { matches: { id: string; score: number }[] },
) {
  return {
    async query(vectorQuery: number[], options: unknown) {
      calls.push({ vector: vectorQuery, options });
      return response;
    },
    async upsert() {},
  };
}

describe("VectorizePlanVectorIndex", () => {
  it("queries the index with the vector and topK", async () => {
    const calls: { vector: number[]; options: unknown }[] = [];
    const index = new VectorizePlanVectorIndex(
      makeIndex(calls, { matches: [{ id: "trades", score: 0.9 }] }),
    );

    const matches = await index.query([0.1, 0.2], 3);

    expect(calls).toEqual([{ vector: [0.1, 0.2], options: { topK: 3 } }]);
    expect(matches).toEqual([{ id: "trades", score: 0.9 }]);
  });

  it("upserts vectors with id and values", async () => {
    const upserts: unknown[] = [];
    const index = new VectorizePlanVectorIndex({
      async query() {
        return { matches: [] };
      },
      async upsert(vectors: unknown) {
        upserts.push(vectors);
      },
    });

    await index.upsert([{ id: "community", values: [1, 2] }]);

    expect(upserts).toEqual([[{ id: "community", values: [1, 2] }]]);
  });
});
