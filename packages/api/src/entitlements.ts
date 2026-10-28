// Single source of truth for plan limits. Every consumer (directory, ads,
// spots, owner-portal) reads through `getEntitlements` / the helpers below.
// Never re-implement a limit anywhere else: add a field here instead.

export const UPGRADE_HINTS = {
  productCreate: "billing.upgradeRequired.productCreate",
} as const;

export const ENTITLEMENTS = {
  free: {
    maxBusinesses: 1,
    products: 0,
    photos: 3,
    media: "flyer+logo",
    photosPerProduct: 0,
    photoMaxMB: 2,
    priority: 0,
    spotEligible: false,
    delivery: true,
    productListingEnabled: false,
  },
  premium: {
    maxBusinesses: null,
    products: 100,
    photos: 30,
    media: "full",
    photosPerProduct: 3,
    photoMaxMB: 2,
    priority: 10,
    spotEligible: true,
    delivery: true,
    productListingEnabled: true,
  },
} as const;

export type PlanId = keyof typeof ENTITLEMENTS;
export type Entitlements = (typeof ENTITLEMENTS)[PlanId];
export type MediaTier = Entitlements["media"];

export class UpgradeRequired extends Error {
  readonly code = "UPGRADE_REQUIRED" as const;
  readonly hint: string;

  constructor(hint: string) {
    super(hint);
    this.name = "UpgradeRequired";
    this.hint = hint;
  }
}

export type ProductCreateResult =
  | { allowed: true }
  | { allowed: false; code: "UPGRADE_REQUIRED"; hint: string };

export function getEntitlements(plan: PlanId): Entitlements {
  return ENTITLEMENTS[plan];
}

export function canCreateProduct(plan: PlanId): ProductCreateResult {
  if (ENTITLEMENTS[plan].productListingEnabled) {
    return { allowed: true };
  }
  return { allowed: false, code: "UPGRADE_REQUIRED", hint: UPGRADE_HINTS.productCreate };
}

export function assertCanCreateProduct(plan: PlanId): void {
  const result = canCreateProduct(plan);
  if (!result.allowed) {
    throw new UpgradeRequired(result.hint);
  }
}

export function isWithinProductQuota(plan: PlanId, used: number): boolean {
  return used < ENTITLEMENTS[plan].products;
}

export function isWithinPhotoQuota(plan: PlanId, used: number): boolean {
  return used < ENTITLEMENTS[plan].photos;
}
