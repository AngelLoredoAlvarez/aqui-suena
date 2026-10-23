// packages/ui/src/ads-carousel/responsive.test.ts

import { describe, expect, it } from "vitest";

import { getResponsiveCarouselMaxW } from "./responsive";

describe("getResponsiveCarouselMaxW", () => {
  it("returns 390 on mobile (no breakpoint active)", () => {
    expect(getResponsiveCarouselMaxW({ md: false, lg: false })).toBe(390);
  });

  it("returns 768 on tablet (md active)", () => {
    expect(getResponsiveCarouselMaxW({ md: true, lg: false })).toBe(768);
  });

  it("returns 1024 on web (lg active)", () => {
    expect(getResponsiveCarouselMaxW({ md: true, lg: true })).toBe(1024);
  });
});
