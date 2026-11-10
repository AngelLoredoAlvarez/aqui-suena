import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it } from "vitest";

import {
  assertCanCreateBusiness,
  assertCanCreateProduct,
  canCreateBusiness,
  canCreateProduct,
  ENTITLEMENTS,
  getEntitlements,
  isWithinPhotoQuota,
  isWithinProductQuota,
  parsePlanId,
  UpgradeRequired,
} from "./entitlements";

describe("ENTITLEMENTS matrix", () => {
  it("defines community with zero products and one marketing photo", () => {
    expect(ENTITLEMENTS.community).toEqual({
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
    });
  });

  it("defines trades with 30 services and 10 work entries", () => {
    expect(ENTITLEMENTS.trades).toEqual({
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
    });
  });

  it("defines commerce with 50 products and full catalog", () => {
    expect(ENTITLEMENTS.commerce).toEqual({
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
    });
  });
});

describe("getEntitlements", () => {
  it("returns the community row unchanged", () => {
    expect(getEntitlements("community")).toBe(ENTITLEMENTS.community);
  });

  it("returns the trades row unchanged", () => {
    expect(getEntitlements("trades")).toBe(ENTITLEMENTS.trades);
  });

  it("returns the commerce row unchanged", () => {
    expect(getEntitlements("commerce")).toBe(ENTITLEMENTS.commerce);
  });
});

describe("canCreateProduct", () => {
  it("denies product creation on community", () => {
    const result = canCreateProduct("community");
    expect(result).toEqual({
      allowed: false,
      code: "UPGRADE_REQUIRED",
      hint: "billing.upgradeRequired.productCreate",
    });
  });

  it("denies product creation on trades", () => {
    const result = canCreateProduct("trades");
    expect(result).toEqual({
      allowed: false,
      code: "UPGRADE_REQUIRED",
      hint: "billing.upgradeRequired.productCreate",
    });
  });

  it("allows product creation on commerce", () => {
    expect(canCreateProduct("commerce")).toEqual({ allowed: true });
  });
});

describe("assertCanCreateProduct", () => {
  it("throws an UpgradeRequired on community", () => {
    let thrown: unknown;
    try {
      assertCanCreateProduct("community");
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(UpgradeRequired);
    expect((thrown as UpgradeRequired).code).toBe("UPGRADE_REQUIRED");
  });

  it("throws an UpgradeRequired on trades", () => {
    let thrown: unknown;
    try {
      assertCanCreateProduct("trades");
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(UpgradeRequired);
    expect((thrown as UpgradeRequired).code).toBe("UPGRADE_REQUIRED");
  });

  it("does not throw on commerce", () => {
    expect(() => assertCanCreateProduct("commerce")).not.toThrow();
  });
});

describe("isWithinProductQuota", () => {
  it("community never allows a product", () => {
    expect(isWithinProductQuota("community", 0)).toBe(false);
  });

  it("trades never allows a product", () => {
    expect(isWithinProductQuota("trades", 0)).toBe(false);
  });

  it("commerce allows up to 50 products", () => {
    expect(isWithinProductQuota("commerce", 0)).toBe(true);
    expect(isWithinProductQuota("commerce", 49)).toBe(true);
    expect(isWithinProductQuota("commerce", 50)).toBe(false);
  });
});

describe("isWithinPhotoQuota", () => {
  it("community allows up to 1 marketing photo", () => {
    expect(isWithinPhotoQuota("community", 0)).toBe(true);
    expect(isWithinPhotoQuota("community", 1)).toBe(false);
  });

  it("trades allows up to 3 marketing photos", () => {
    expect(isWithinPhotoQuota("trades", 2)).toBe(true);
    expect(isWithinPhotoQuota("trades", 3)).toBe(false);
  });

  it("commerce allows up to 30 marketing photos", () => {
    expect(isWithinPhotoQuota("commerce", 29)).toBe(true);
    expect(isWithinPhotoQuota("commerce", 30)).toBe(false);
  });
});

describe("canCreateBusiness", () => {
  it("allows creating the first business on community", () => {
    expect(canCreateBusiness("community", 0)).toEqual({ allowed: true });
  });

  it("denies a second business on community", () => {
    expect(canCreateBusiness("community", 1)).toEqual({
      allowed: false,
      code: "UPGRADE_REQUIRED",
      hint: "billing.upgradeRequired.businessCreate",
    });
  });

  it("allows up to 3 businesses on trades", () => {
    expect(canCreateBusiness("trades", 0)).toEqual({ allowed: true });
    expect(canCreateBusiness("trades", 2)).toEqual({ allowed: true });
  });

  it("denies a 4th business on trades", () => {
    expect(canCreateBusiness("trades", 3)).toEqual({
      allowed: false,
      code: "UPGRADE_REQUIRED",
      hint: "billing.upgradeRequired.businessCreate",
    });
  });

  it("allows up to 10 businesses on commerce", () => {
    expect(canCreateBusiness("commerce", 9)).toEqual({ allowed: true });
  });

  it("denies an 11th business on commerce", () => {
    expect(canCreateBusiness("commerce", 10)).toEqual({
      allowed: false,
      code: "UPGRADE_REQUIRED",
      hint: "billing.upgradeRequired.businessCreate",
    });
  });
});

describe("parsePlanId", () => {
  it.each(["community", "trades", "commerce"])("accepts the valid plan id %s", (id) => {
    expect(parsePlanId(id)).toBe(id);
  });

  it.each(["premium", "", "COMMUNITY"])("rejects the unknown plan id %s", (value) => {
    expect(() => parsePlanId(value)).toThrow(DataIntegrityError);
  });

  it.each([null, undefined, 42, {}])("rejects the non-string value %s", (value) => {
    expect(() => parsePlanId(value)).toThrow(DataIntegrityError);
  });

  it("carries the field and the offending value", () => {
    let thrown: unknown;
    try {
      parsePlanId("premium");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(DataIntegrityError);
    expect(thrown).toMatchObject({ field: "planId", value: "premium" });
  });
});

describe("assertCanCreateBusiness", () => {
  it("throws UpgradeRequired when the cap is reached", () => {
    expect(() => assertCanCreateBusiness("community", 1)).toThrow(UpgradeRequired);
  });

  it("does not throw below the cap", () => {
    expect(() => assertCanCreateBusiness("community", 0)).not.toThrow();
  });
});
