// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { getResponsiveMaxW } from "./responsive";

describe("getResponsiveMaxW", () => {
  it("keeps the 390 mobile canvas below the md breakpoint", () => {
    expect(getResponsiveMaxW({ md: false })).toBe(390);
  });

  it("uses the 1440 wide canvas from the md breakpoint up", () => {
    expect(getResponsiveMaxW({ md: true })).toBe(1440);
  });
});
