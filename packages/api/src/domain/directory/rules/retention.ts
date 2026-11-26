// Pure helpers for plan downgrade without data loss.
//
// When a plan's business cap shrinks (e.g. commerce -> community), the owner
// chooses which businesses stay visible (up to the new cap); the rest are
// hidden, not deleted, and retained for 90 days before permanent deletion.
export const RETENTION_DAYS = 90;

export function hiddenBusinessIds(
  allIds: readonly string[],
  visibleIds: readonly string[],
): string[] {
  const visible = new Set(visibleIds);

  return allIds.filter((id) => !visible.has(id));
}

export type VisibleSelectionResult =
  | { allowed: true }
  | { allowed: false; code: "UPGRADE_REQUIRED"; hint: string };

export function canChooseVisibleCount(cap: number, visibleCount: number): VisibleSelectionResult {
  if (visibleCount <= cap) {
    return { allowed: true };
  }

  return {
    allowed: false,
    code: "UPGRADE_REQUIRED",
    hint: "billing.upgradeRequired.visibleSelection",
  };
}

export function retentionDeadline(hiddenAt: Date): Date {
  const deadline = new Date(hiddenAt);

  deadline.setDate(deadline.getDate() + RETENTION_DAYS);

  return deadline;
}

export function isRetentionExpired(retainedUntil: Date, now: Date): boolean {
  return retainedUntil.getTime() <= now.getTime();
}
