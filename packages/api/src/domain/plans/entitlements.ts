// Single source of truth for plan limits. Every consumer (directory, ads,
// spots, owner-portal) reads through `getEntitlements` / the helpers below.
// Never re-implement a limit anywhere else: add a field here instead.

import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";

export const UPGRADE_HINTS = {
  productCreate: "billing.upgradeRequired.productCreate",
  businessCreate: "billing.upgradeRequired.businessCreate",
  visibleSelection: "billing.upgradeRequired.visibleSelection",
} as const;

export const ENTITLEMENTS = {
  community: {
    maxBusinesses: 1,
    products: 0,
    photos: 1,
    media: "flyer+logo",
    photosPerProduct: 0,
    photoMaxMB: 2,
    priority: 0,
    spotEligible: false,
    delivery: true,
    productListingEnabled: false,
    services: 0,
    workEntries: 0,
    workPhotosPerEntry: 0,
    carouselAppearances: 1,
    flyerCooldownDays: 15,
  },
  trades: {
    maxBusinesses: 3,
    products: 0,
    photos: 3,
    media: "full",
    photosPerProduct: 0,
    photoMaxMB: 2,
    priority: 10,
    spotEligible: false,
    delivery: true,
    productListingEnabled: false,
    services: 30,
    workEntries: 10,
    workPhotosPerEntry: 3,
    carouselAppearances: 2,
    flyerCooldownDays: 0,
  },
  commerce: {
    maxBusinesses: 10,
    products: 50,
    photos: 30,
    media: "full",
    photosPerProduct: 3,
    photoMaxMB: 2,
    priority: 20,
    spotEligible: false,
    delivery: true,
    productListingEnabled: true,
    services: 30,
    workEntries: 10,
    workPhotosPerEntry: 3,
    carouselAppearances: 3,
    flyerCooldownDays: 0,
  },
} as const;

export type PlanId = keyof typeof ENTITLEMENTS;
export type Entitlements = (typeof ENTITLEMENTS)[PlanId];
export type MediaTier = Entitlements["media"];

/** Narrows an untrusted value to a known plan id without throwing. */
export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && Object.hasOwn(ENTITLEMENTS, value);
}

/**
 * Parses a persisted plan id. Unknown values are a data-integrity failure, not
 * a silent fallback, so a stale migration or manual write cannot masquerade as
 * a valid plan.
 */
export function parsePlanId(value: unknown): PlanId {
  if (isPlanId(value)) return value;

  throw new DataIntegrityError("planId", value);
}

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

export type BusinessCreateResult =
  | { allowed: true }
  | { allowed: false; code: "UPGRADE_REQUIRED"; hint: string };

export function canCreateBusiness(plan: PlanId, currentCount: number): BusinessCreateResult {
  if (currentCount < ENTITLEMENTS[plan].maxBusinesses) {
    return { allowed: true };
  }

  return {
    allowed: false,
    code: "UPGRADE_REQUIRED",
    hint: UPGRADE_HINTS.businessCreate,
  };
}

export function assertCanCreateBusiness(plan: PlanId, currentCount: number): void {
  const result = canCreateBusiness(plan, currentCount);

  if (!result.allowed) {
    throw new UpgradeRequired(result.hint);
  }
}

export function isWithinPhotoQuota(plan: PlanId, used: number): boolean {
  return used < ENTITLEMENTS[plan].photos;
}

export function isWithinProductPhotoQuota(plan: PlanId, used: number): boolean {
  return used < ENTITLEMENTS[plan].photosPerProduct;
}
