import { describe, expect, it } from "vitest";

import {
  assertCanCreateProduct,
  canCreateProduct,
  ENTITLEMENTS,
  getEntitlements,
  isWithinPhotoQuota,
  isWithinProductQuota,
  UpgradeRequired,
} from "./entitlements";

describe("ENTITLEMENTS matrix", () => {
  it("defines the free plan with zero products and 3 marketing photos", () => {
    expect(ENTITLEMENTS.free).toEqual({
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
    });
  });

  it("defines the premium plan with 100 products and 30 marketing photos", () => {
    expect(ENTITLEMENTS.premium).toEqual({
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
    });
  });
});

describe("getEntitlements", () => {
  it("returns the free row unchanged", () => {
    expect(getEntitlements("free")).toBe(ENTITLEMENTS.free);
  });

  it("returns the premium row unchanged", () => {
    expect(getEntitlements("premium")).toBe(ENTITLEMENTS.premium);
  });
});

describe("canCreateProduct", () => {
  it("denies product creation on free with a typed UPGRADE_REQUIRED", () => {
    const result = canCreateProduct("free");
    expect(result).toEqual({
      allowed: false,
      code: "UPGRADE_REQUIRED",
      hint: "billing.upgradeRequired.productCreate",
    });
  });

  it("allows product creation on premium", () => {
    expect(canCreateProduct("premium")).toEqual({ allowed: true });
  });
});

describe("assertCanCreateProduct", () => {
  it("throws an UpgradeRequired on free", () => {
    let thrown: unknown;
    try {
      assertCanCreateProduct("free");
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(UpgradeRequired);
    expect((thrown as UpgradeRequired).code).toBe("UPGRADE_REQUIRED");
  });

  it("does not throw on premium", () => {
    expect(() => assertCanCreateProduct("premium")).not.toThrow();
  });
});

describe("isWithinProductQuota", () => {
  it("free never allows a product (0 limit)", () => {
    expect(isWithinProductQuota("free", 0)).toBe(false);
  });

  it("premium allows up to 100 products", () => {
    expect(isWithinProductQuota("premium", 0)).toBe(true);
    expect(isWithinProductQuota("premium", 99)).toBe(true);
    expect(isWithinProductQuota("premium", 100)).toBe(false);
  });
});

describe("isWithinPhotoQuota", () => {
  it("free allows up to 3 marketing photos", () => {
    expect(isWithinPhotoQuota("free", 0)).toBe(true);
    expect(isWithinPhotoQuota("free", 2)).toBe(true);
    expect(isWithinPhotoQuota("free", 3)).toBe(false);
  });

  it("premium allows up to 30 marketing photos", () => {
    expect(isWithinPhotoQuota("premium", 29)).toBe(true);
    expect(isWithinPhotoQuota("premium", 30)).toBe(false);
  });
});
