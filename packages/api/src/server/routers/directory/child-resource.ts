import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { assertBusinessOwned } from "@aqui-suena/api/server/routers/directory/access";
import { requireFound } from "@aqui-suena/api/server/trpc/errors";

/**
 * Resolves a directory child resource and proves the caller owns its business.
 *
 * Every `update` and `delete` on a child (product, service, photo, flyer, hour,
 * work entry) follows the same order: resolve first so a missing resource
 * answers NOT_FOUND, then check ownership so a foreign one answers the same
 * thing. Keeping the protocol here means a new child resource cannot forget
 * half of it.
 */
export async function findOwned<T extends { businessId: string }>(
  load: (id: string) => Promise<T | null>,
  business: BusinessRepository,
  accountId: string,
  id: string,
  notFoundMessage: string,
): Promise<T> {
  const current = requireFound(await load(id), notFoundMessage);

  await assertBusinessOwned(business, accountId, current.businessId);

  return current;
}
