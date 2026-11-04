import type { EmbeddingModel } from "@aqui-suena/api/domain/support/plan-catalog";

/** Minimal shape of the Workers AI binding used for embeddings. */
export interface AiEmbeddingBinding {
  run(model: string, inputs: { text: string[] }): Promise<{ shape: number[]; data: number[][] }>;
}

/**
 * Embeds text via the Workers AI binding. The model name is injected so it
 * stays swappable (e.g. @cf/baai/bge-m3 multilingual vs bge-small-en).
 */
export class WorkersAiEmbeddingModel implements EmbeddingModel {
  constructor(
    private readonly ai: AiEmbeddingBinding,
    readonly model: string,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    const result = await this.ai.run(this.model, { text: texts });
    return result.data;
  }
}
