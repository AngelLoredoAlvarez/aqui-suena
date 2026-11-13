import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";

/**
 * Public child listings only include children whose parent business is
 * visible. A hidden business is retained for its owner but must not surface
 * in any public list.
 */
export async function visibleBusinessIds(repository: BusinessRepository): Promise<Set<string>> {
  const businesses = await repository.listAll();

  return new Set(businesses.map((business) => business.id));
}
