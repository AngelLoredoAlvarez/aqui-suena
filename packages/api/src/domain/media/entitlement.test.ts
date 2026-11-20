import { assertCanUploadMedia, canUploadMedia } from "@aqui-suena/api/domain/media/entitlement";
import { UpgradeRequired } from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it } from "vitest";

const UPGRADE = {
  allowed: false,
  code: "UPGRADE_REQUIRED",
  hint: "billing.upgradeRequired.mediaUpload",
} as const;

describe("canUploadMedia", () => {
  it("allows account avatars on every plan", () => {
    expect(canUploadMedia("community", "avatar")).toEqual({ allowed: true });
    expect(canUploadMedia("trades", "avatar")).toEqual({ allowed: true });
    expect(canUploadMedia("commerce", "avatar")).toEqual({ allowed: true });
  });

  it("allows flyers on every plan", () => {
    expect(canUploadMedia("community", "flyer")).toEqual({ allowed: true });
    expect(canUploadMedia("trades", "flyer")).toEqual({ allowed: true });
    expect(canUploadMedia("commerce", "flyer")).toEqual({ allowed: true });
  });

  it("gates product photos behind a full-media plan", () => {
    expect(canUploadMedia("community", "product-photo")).toEqual(UPGRADE);
    expect(canUploadMedia("trades", "product-photo")).toEqual({ allowed: true });
    expect(canUploadMedia("commerce", "product-photo")).toEqual({ allowed: true });
  });

  it("gates spot audio behind the spot entitlement", () => {
    expect(canUploadMedia("community", "spot-audio")).toEqual(UPGRADE);
    expect(canUploadMedia("trades", "spot-audio")).toEqual(UPGRADE);
    expect(canUploadMedia("commerce", "spot-audio")).toEqual(UPGRADE);
  });
});

describe("assertCanUploadMedia", () => {
  it("throws UpgradeRequired with the media hint", () => {
    expect(() => assertCanUploadMedia("community", "product-photo")).toThrow(UpgradeRequired);

    try {
      assertCanUploadMedia("community", "product-photo");
    } catch (error) {
      expect(error).toMatchObject({ hint: "billing.upgradeRequired.mediaUpload" });
    }
  });

  it("accepts an allowed kind", () => {
    expect(() => assertCanUploadMedia("commerce", "flyer")).not.toThrow();
  });
});
