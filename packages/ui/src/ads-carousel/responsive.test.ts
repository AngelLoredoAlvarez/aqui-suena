// packages/ui/src/ads-carousel/responsive.test.ts

import { describe, expect, it } from "vitest";
import { getResponsiveCarouselMaxW, getResponsiveFlyerWidth } from "./responsive";

describe("getResponsiveCarouselMaxW", () => {
  it("returns 390 for mobile (no breakpoint)", () => {
    expect(getResponsiveCarouselMaxW({ md: false, lg: false, xl: false })).toBe(390);
  });

  it("returns 768 for small tablet (md)", () => {
    expect(getResponsiveCarouselMaxW({ md: true, lg: false, xl: false })).toBe(768);
  });

  it("returns 1024 for tablet (lg)", () => {
    expect(getResponsiveCarouselMaxW({ md: true, lg: true, xl: false })).toBe(1024);
  });

  it("returns 1440 for web (xl)", () => {
    expect(getResponsiveCarouselMaxW({ md: true, lg: true, xl: true })).toBe(1440);
  });
});

describe("getResponsiveFlyerWidth", () => {
  it("is undefined on mobile (flyer fills width)", () => {
    expect(getResponsiveFlyerWidth({ md: false, lg: false, xl: false })).toBeUndefined();
  });

  it("is 330 on tablet (md and lg)", () => {
    expect(getResponsiveFlyerWidth({ md: true, lg: false, xl: false })).toBe(330);
    expect(getResponsiveFlyerWidth({ md: true, lg: true, xl: false })).toBe(330);
  });

  it("is 480 on web (xl)", () => {
    expect(getResponsiveFlyerWidth({ md: true, lg: true, xl: true })).toBe(480);
  });
});
