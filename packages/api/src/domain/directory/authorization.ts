import type { Business, BusinessRepository } from "@aqui-suena/api/domain/directory/business";

export class BusinessAccessDeniedError extends Error {
  constructor() {
    super("Business not found");
    this.name = "BusinessAccessDeniedError";
  }
}

/**
 * Authorization guard for directory mutations.
 *
 * Resolves the business through the owner-scoped lookup so a hidden business
 * remains manageable by its owner, then rejects any account that does not own
 * it. Callers translate the error into NOT_FOUND so foreign resources do not
 * leak their existence.
 */
export async function assertOwnsBusiness(
  repository: BusinessRepository,
  accountId: string,
  businessId: string,
): Promise<Business> {
  const business = await repository.getByIdForOwner(businessId);

  if (business === null || business.accountId !== accountId) {
    throw new BusinessAccessDeniedError();
  }

  return business;
}
