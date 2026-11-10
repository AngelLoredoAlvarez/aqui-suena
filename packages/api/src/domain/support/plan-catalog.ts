import type { Plan, PlanRepository } from "@aqui-suena/api/domain/billing/catalog/plans";

/**
 * Text embedded per plan. The retrieval quality depends entirely on this
 * document: it must contain everything a support question could match on.
 */
export function planDocument(plan: Plan): string {
  return [
    plan.name,
    plan.audience,
    plan.description,
    `Beneficios: ${plan.benefits.join(", ")}`,
    `Precio mensual: ${plan.priceMonthly} ${plan.currency}`,
  ].join("\n");
}

export interface SeedPlanVectorsOptions {
  planRepository: PlanRepository;
  embeddingModel: EmbeddingModel;
  vectorIndex: PlanVectorIndex;
}

/**
 * Retrieves the plan-catalog context relevant to a support question.
 * Implementations decide the strategy (full catalog vs vector search).
 */
export interface PlanCatalogRetriever {
  retrieve(query: string): Promise<Plan[]>;
}

/**
 * Embedding port: turns text into vectors. Implemented by a Workers AI
 * adapter in infrastructure; fakes in tests capture the inputs.
 */
export interface EmbeddingModel {
  readonly model: string;
  embed(texts: string[]): Promise<number[][]>;
}

/**
 * Vector index port: similarity search over embedded plan documents.
 * Implemented by a Vectorize adapter in infrastructure.
 */
export interface PlanVectorIndex {
  query(vector: number[], topK: number): Promise<{ id: string; score: number }[]>;
  upsert(vectors: { id: string; values: number[] }[]): Promise<void>;
}

/** Interface for logging errors. */
export interface Logger {
  error(message: string, ...args: unknown[]): void;
}

/** Current behavior: inject the whole catalog into the prompt. */
export class FullCatalogRetriever implements PlanCatalogRetriever {
  constructor(private readonly planRepository: PlanRepository) {}

  async retrieve(query: string): Promise<Plan[]> {
    void query; // the full catalog ignores the query by design
    return this.planRepository.list();
  }
}

export interface VectorPlanCatalogRetrieverOptions {
  planRepository: PlanRepository;
  embeddingModel: EmbeddingModel;
  vectorIndex: PlanVectorIndex;
  topK: number;
  logger?: Logger;
}

/**
 * RAG-style retrieval: embed the question, search the vector index, and map
 * the matching ids back to plans ordered by similarity score. Any failure
 * (embedding or index) degrades to the full catalog instead of breaking the
 * chatbot.
 */
export class VectorPlanCatalogRetriever implements PlanCatalogRetriever {
  private readonly fallback: FullCatalogRetriever;
  private readonly logger: Logger;

  constructor(private readonly options: VectorPlanCatalogRetrieverOptions) {
    this.fallback = new FullCatalogRetriever(options.planRepository);
    this.logger = options.logger ?? { error: console.error.bind(console) };
  }

  async retrieve(query: string): Promise<Plan[]> {
    const plans = await this.options.planRepository.list();
    const byId = new Map<string, Plan>(plans.map((plan) => [plan.id, plan]));

    try {
      const [vector] = await this.options.embeddingModel.embed([query]);
      if (!vector) {
        return this.fallback.retrieve(query);
      }

      const matches = await this.options.vectorIndex.query(vector, this.options.topK);
      const ranked = matches
        .slice()
        .sort((a, b) => b.score - a.score)
        .map((match) => byId.get(match.id))
        .filter((plan): plan is Plan => plan !== undefined);

      return ranked.length > 0 ? ranked : this.fallback.retrieve(query);
    } catch (error) {
      this.logger.error("plan-catalog: vector retrieval failed, falling back", error);
      return this.fallback.retrieve(query);
    }
  }
}

/** Embeds every active plan and upserts the vectors into the index. */
export async function seedPlanVectors(
  options: SeedPlanVectorsOptions,
): Promise<{ seeded: number }> {
  const plans = (await options.planRepository.list()).filter((plan) => plan.active);
  if (plans.length === 0) {
    return { seeded: 0 };
  }

  const documents = plans.map(planDocument);
  const vectors = await options.embeddingModel.embed(documents);

  await options.vectorIndex.upsert(
    plans.map((plan, i) => ({ id: plan.id, values: vectors[i] ?? [] })),
  );

  return { seeded: plans.length };
}
