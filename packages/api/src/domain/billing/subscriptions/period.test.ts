import { addMonths } from "@aqui-suena/api/domain/billing/subscriptions/period";
import { describe, expect, it } from "vitest";

function iso(date: Date): string {
  return date.toISOString();
}

function withProcessTz(tz: string | undefined, run: () => string): string {
  const previous = process.env.TZ;

  try {
    if (tz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = tz;
    }

    return run();
  } finally {
    if (previous === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previous;
    }
  }
}

describe("addMonths", () => {
  it("clamps January 31 to the last day of February", () => {
    expect(iso(addMonths(new Date("2026-01-31T00:00:00Z"), 1))).toBe("2026-02-28T00:00:00.000Z");
  });

  it("clamps January 31 to February 29 in a leap year", () => {
    expect(iso(addMonths(new Date("2024-01-31T00:00:00Z"), 1))).toBe("2024-02-29T00:00:00.000Z");
  });

  it("clamps March 31 to April 30", () => {
    expect(iso(addMonths(new Date("2026-03-31T00:00:00Z"), 1))).toBe("2026-04-30T00:00:00.000Z");
  });

  it("rolls December 31 into the next January", () => {
    expect(iso(addMonths(new Date("2026-12-31T00:00:00Z"), 1))).toBe("2027-01-31T00:00:00.000Z");
  });

  it("preserves the day when it exists in the target month", () => {
    expect(iso(addMonths(new Date("2026-01-15T00:00:00Z"), 1))).toBe("2026-02-15T00:00:00.000Z");
  });

  it("preserves the time of day and milliseconds", () => {
    expect(iso(addMonths(new Date("2026-01-31T23:45:12.345Z"), 1))).toBe(
      "2026-02-28T23:45:12.345Z",
    );
  });

  it("does not mutate the input date", () => {
    const input = new Date("2026-01-31T12:00:00Z");
    const before = input.getTime();

    addMonths(input, 1);

    expect(input.getTime()).toBe(before);
  });

  it("returns the same result under different process time zones", () => {
    const input = new Date("2026-03-01T02:00:00Z");
    const results = ["UTC", "America/Los_Angeles", "Asia/Tokyo"].map((tz) =>
      withProcessTz(tz, () => iso(addMonths(input, 1))),
    );

    // UTC calendar math: 2026-03-01T02:00Z + 1 month is 2026-04-01T02:00Z.
    for (const result of results) {
      expect(result).toBe("2026-04-01T02:00:00.000Z");
    }
  });
});
