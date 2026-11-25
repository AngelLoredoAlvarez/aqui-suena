import { describe, expect, it } from "vitest";
import { splashLayout } from "./splash-layout";

describe("splashLayout", () => {
  it("uses the compact sizes below the 600px breakpoint", () => {
    expect(splashLayout(375)).toEqual({
      wide: false,
      logoSize: 140,
      titleSize: 34,
      trackWidth: 126,
      trackMargin: 21,
      footerBottom: 40,
      footerSize: 15,
      markSize: 32,
    });
  });

  it("switches to the wide layout at exactly 600px", () => {
    expect(splashLayout(600).wide).toBe(true);
  });

  it("uses the wide sizes above the breakpoint", () => {
    expect(splashLayout(1024)).toEqual({
      wide: true,
      logoSize: 196,
      titleSize: 48,
      trackWidth: 176,
      trackMargin: 29,
      footerBottom: 48,
      footerSize: 17,
      markSize: 38,
    });
  });
});
