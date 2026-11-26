import {
  cancellationDeadline,
  isWithinCancellationWindow,
} from "@aqui-suena/api/domain/billing/invoices/model/cancellation-window";
import { describe, expect, it } from "vitest";

const issued = new Date("2026-05-10T18:00:00Z");

describe("isWithinCancellationWindow", () => {
  it("allows cancellation during the invoice's own fiscal year", () => {
    expect(isWithinCancellationWindow(issued, new Date("2026-12-31T23:00:00Z"))).toBe(true);
  });

  it("allows it through March of the following year", () => {
    expect(isWithinCancellationWindow(issued, new Date("2027-03-15T12:00:00Z"))).toBe(true);
  });

  it("rejects it once April starts in Mexico City", () => {
    expect(isWithinCancellationWindow(issued, new Date("2027-04-01T12:00:00Z"))).toBe(false);
  });

  it("counts late on March 31 in Mexico City as inside the window", () => {
    // 2027-03-31 23:30 in Mexico City is 2027-04-01 05:30 UTC.
    expect(isWithinCancellationWindow(issued, new Date("2027-04-01T05:30:00Z"))).toBe(true);
  });

  it("rejects a cancellation requested before the invoice existed", () => {
    expect(isWithinCancellationWindow(issued, new Date("2026-01-01T12:00:00Z"))).toBe(false);
  });

  it("reports the deadline month it enforces", () => {
    expect(cancellationDeadline(issued)).toEqual({ year: 2027, month: 3 });
  });
});
