import type { PlanVectorIndex } from "@aqui-suena/api/domain/support/plan-catalog";

/** Minimal shape of the Vectorize binding used for plan vectors. */
export interface VectorizeIndexBinding {
  query(
    vectorQuery: number[],
    options: { topK: number },
  ): Promise<{ matches: { id: string; score: number }[] }>;
  upsert(vectors: { id: string; values: number[] }[]): Promise<unknown>;
}

/** Translates our PlanVectorIndex port to the Vectorize binding API. */
export class VectorizePlanVectorIndex implements PlanVectorIndex {
  constructor(private readonly index: VectorizeIndexBinding) {}

  async query(vector: number[], topK: number): Promise<{ id: string; score: number }[]> {
    const result = await this.index.query(vector, { topK });
    return result.matches;
  }

  async upsert(vectors: { id: string; values: number[] }[]): Promise<void> {
    await this.index.upsert(vectors);
  }
}
