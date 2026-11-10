// Pure helpers for the failed-renewal grace window.
export const GRACE_DAYS = 7;

export function graceDeadline(failedAt: Date): Date {
  const deadline = new Date(failedAt);

  deadline.setDate(deadline.getDate() + GRACE_DAYS);

  return deadline;
}

export function isInGracePeriod(graceEnd: Date, now: Date): boolean {
  return now.getTime() <= graceEnd.getTime();
}
