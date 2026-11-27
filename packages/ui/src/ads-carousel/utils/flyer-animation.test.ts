import { flyerLayerStyle } from "@aqui-suena/ui/ads-carousel/utils/flyer-animation";
import { describe, expect, it } from "vitest";

describe("flyerLayerStyle", () => {
  it("fades and slides in on web", () => {
    expect(flyerLayerStyle(true, false)).toEqual({ opacity: 0, x: 12 });
    expect(flyerLayerStyle(true, true)).toEqual({ opacity: 1, x: 0 });
  });

  it("only slides on native and never fades the flyer out", () => {
    expect(flyerLayerStyle(false, false)).toEqual({ opacity: 1, x: 12 });
    expect(flyerLayerStyle(false, true)).toEqual({ opacity: 1, x: 0 });
  });
});
