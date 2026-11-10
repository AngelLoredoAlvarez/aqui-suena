import {
  assertOwnsBusiness,
  BusinessAccessDeniedError,
} from "@aqui-suena/api/domain/directory/authorization";
import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { TRPCError } from "@trpc/server";

/**
 * Domain guard adapter: maps an ownership denial to NOT_FOUND so a resource
 * owned by another account never reveals that it exists.
 */
export async function assertBusinessOwned(
  repository: BusinessRepository,
  accountId: string,
  businessId: string,
): Promise<void> {
  try {
    await assertOwnsBusiness(repository, accountId, businessId);
  } catch (error) {
    if (error instanceof BusinessAccessDeniedError) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
    }

    throw error;
  }
}
