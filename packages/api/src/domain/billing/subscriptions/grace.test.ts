import { describe, expect, it } from "vitest";

import { GRACE_DAYS, graceDeadline, isInGracePeriod } from "./grace";

describe("graceDeadline", () => {
  it("adds 7 days to the failed date", () => {
    const failed = new Date("2026-11-06T00:00:00Z");
    const deadline = graceDeadline(failed);

    expect(deadline.toISOString()).toBe("2026-11-13T00:00:00.000Z");
  });

  it("does not mutate the input date", () => {
    const failed = new Date("2026-11-06T00:00:00Z");
    const snapshot = failed.getTime();

    graceDeadline(failed);

    expect(failed.getTime()).toBe(snapshot);
  });
});

describe("isInGracePeriod", () => {
  it("returns true when now is before the grace end", () => {
    const graceEnd = new Date("2026-11-13T00:00:00Z");
    const now = new Date("2026-11-10T00:00:00Z");

    expect(isInGracePeriod(graceEnd, now)).toBe(true);
  });

  it("returns true when now equals the grace end", () => {
    const graceEnd = new Date("2026-11-13T00:00:00Z");

    expect(isInGracePeriod(graceEnd, graceEnd)).toBe(true);
  });

  it("returns false when now is past the grace end", () => {
    const graceEnd = new Date("2026-11-13T00:00:00Z");
    const now = new Date("2026-11-14T00:00:00Z");

    expect(isInGracePeriod(graceEnd, now)).toBe(false);
  });
});

describe("GRACE_DAYS", () => {
  it("is 7", () => {
    expect(GRACE_DAYS).toBe(7);
  });
});
