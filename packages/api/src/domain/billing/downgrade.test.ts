import { describe, expect, it } from "vitest";

import {
  canChooseVisibleCount,
  GRACE_DAYS,
  graceDeadline,
  hiddenBusinessIds,
  isInGracePeriod,
  isRetentionExpired,
  RETENTION_DAYS,
  retentionDeadline,
} from "./downgrade";

describe("hiddenBusinessIds", () => {
  it("returns ids not in the visible set", () => {
    expect(hiddenBusinessIds(["a", "b", "c"], ["a"])).toEqual(["b", "c"]);
  });

  it("returns empty when all are visible", () => {
    expect(hiddenBusinessIds(["a", "b"], ["a", "b"])).toEqual([]);
  });

  it("returns all when none are visible", () => {
    expect(hiddenBusinessIds(["a", "b"], [])).toEqual(["a", "b"]);
  });

  it("ignores visible ids not present in allIds", () => {
    expect(hiddenBusinessIds(["a"], ["a", "z"])).toEqual([]);
  });

  it("does not mutate input", () => {
    const all = ["a", "b", "c"];
    const visible = ["a"];
    const snapshotAll = [...all];
    const snapshotVisible = [...visible];

    hiddenBusinessIds(all, visible);

    expect(all).toEqual(snapshotAll);
    expect(visible).toEqual(snapshotVisible);
  });
});

describe("canChooseVisibleCount", () => {
  it("allows selecting up to the cap", () => {
    expect(canChooseVisibleCount(1, 0)).toEqual({ allowed: true });
    expect(canChooseVisibleCount(1, 1)).toEqual({ allowed: true });
    expect(canChooseVisibleCount(3, 2)).toEqual({ allowed: true });
  });

  it("rejects selecting more than the cap", () => {
    expect(canChooseVisibleCount(1, 2)).toEqual({
      allowed: false,
      code: "UPGRADE_REQUIRED",
      hint: "billing.upgradeRequired.visibleSelection",
    });
  });
});

describe("retentionDeadline", () => {
  it("adds 90 days to the hidden date", () => {
    const hidden = new Date("2026-11-06T00:00:00Z");
    const deadline = retentionDeadline(hidden);

    expect(deadline.toISOString()).toBe("2027-02-04T00:00:00.000Z");
  });

  it("does not mutate the input date", () => {
    const hidden = new Date("2026-11-06T00:00:00Z");
    const snapshot = hidden.getTime();

    retentionDeadline(hidden);

    expect(hidden.getTime()).toBe(snapshot);
  });
});

describe("isRetentionExpired", () => {
  it("returns true when now is past the deadline", () => {
    const deadline = new Date("2026-11-06T00:00:00Z");
    const now = new Date("2026-11-07T00:00:00Z");

    expect(isRetentionExpired(deadline, now)).toBe(true);
  });

  it("returns true when now equals the deadline", () => {
    const deadline = new Date("2026-11-06T00:00:00Z");

    expect(isRetentionExpired(deadline, deadline)).toBe(true);
  });

  it("returns false when now is before the deadline", () => {
    const deadline = new Date("2026-11-06T00:00:00Z");
    const now = new Date("2026-11-05T00:00:00Z");

    expect(isRetentionExpired(deadline, now)).toBe(false);
  });
});

describe("RETENTION_DAYS", () => {
  it("is 90", () => {
    expect(RETENTION_DAYS).toBe(90);
  });
});

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
