import { WorkersAiEmbeddingModel } from "@aqui-suena/api/infrastructure/support/workers-ai-embedding-model";
import { describe, expect, it } from "vitest";

function makeAi(
  calls: { model: string; inputs: unknown }[],
  response: { shape: number[]; data: number[][] },
) {
  return {
    async run(model: string, inputs: unknown) {
      calls.push({ model, inputs });
      return response;
    },
  };
}

describe("WorkersAiEmbeddingModel", () => {
  it("embeds texts with the configured model", async () => {
    const calls: { model: string; inputs: unknown }[] = [];
    const model = new WorkersAiEmbeddingModel(
      makeAi(calls, { shape: [1, 3], data: [[0.1, 0.2, 0.3]] }),
      "@cf/baai/bge-m3",
    );

    const vectors = await model.embed(["hola"]);

    expect(calls).toEqual([{ model: "@cf/baai/bge-m3", inputs: { text: ["hola"] } }]);
    expect(vectors).toEqual([[0.1, 0.2, 0.3]]);
  });

  it("embeds multiple texts preserving order", async () => {
    const calls: { model: string; inputs: unknown }[] = [];
    const model = new WorkersAiEmbeddingModel(
      makeAi(calls, {
        shape: [2, 2],
        data: [
          [1, 2],
          [3, 4],
        ],
      }),
      "@cf/baai/bge-m3",
    );

    const vectors = await model.embed(["uno", "dos"]);

    expect(calls[0]?.inputs).toEqual({ text: ["uno", "dos"] });
    expect(vectors).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });
});
