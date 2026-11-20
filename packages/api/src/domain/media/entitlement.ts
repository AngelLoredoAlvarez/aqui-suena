import type { MediaKind } from "@aqui-suena/api/domain/media/media-kind";
import {
  getEntitlements,
  type MediaTier,
  type PlanId,
  UPGRADE_HINTS,
} from "@aqui-suena/api/domain/plans/entitlements";
import { UpgradeRequired } from "@aqui-suena/api/shared/domain-error";

const TIER_KINDS: Record<MediaTier, readonly MediaKind[]> = {
  "flyer+logo": ["flyer"],
  full: ["flyer", "product-photo"],
};

export type MediaUploadPermission =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly code: "UPGRADE_REQUIRED"; readonly hint: string };

export function canUploadMedia(plan: PlanId, kind: MediaKind): MediaUploadPermission {
  if (kind === "avatar") {
    return { allowed: true };
  }

  if (kind === "spot-audio") {
    return getEntitlements(plan).spotEligible
      ? { allowed: true }
      : { allowed: false, code: "UPGRADE_REQUIRED", hint: UPGRADE_HINTS.mediaUpload };
  }

  return TIER_KINDS[getEntitlements(plan).media].includes(kind)
    ? { allowed: true }
    : { allowed: false, code: "UPGRADE_REQUIRED", hint: UPGRADE_HINTS.mediaUpload };
}

export function assertCanUploadMedia(plan: PlanId, kind: MediaKind): void {
  const permission = canUploadMedia(plan, kind);

  if (!permission.allowed) {
    throw new UpgradeRequired(permission.hint);
  }
}
