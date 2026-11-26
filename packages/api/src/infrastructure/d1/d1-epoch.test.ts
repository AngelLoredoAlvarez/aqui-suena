import { fromEpoch, toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";
import { describe, expect, it } from "vitest";

describe("toEpoch", () => {
  it("converts a Date to integer seconds", () => {
    expect(toEpoch(new Date(0))).toBe(0);
    expect(toEpoch(new Date(5000))).toBe(5);
  });

  it("floors sub-second precision", () => {
    expect(toEpoch(new Date(5999))).toBe(5);
  });
});

describe("fromEpoch", () => {
  it("returns null for a null column", () => {
    expect(fromEpoch(null)).toBeNull();
  });

  it("converts integer seconds back to a Date", () => {
    expect(fromEpoch(5)).toEqual(new Date(5000));
  });
});
