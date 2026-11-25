import {
  clampOffset,
  clampScale,
  distance,
  MAX_SCALE,
  pinchScale,
  toggleScale,
} from "@aqui-suena/ui/zoomable-image/zoom";
import { describe, expect, it } from "vitest";

describe("zoom math", () => {
  it("keeps the scale inside the allowed range", () => {
    expect(clampScale(0.4)).toBe(1);
    expect(clampScale(2)).toBe(2);
    expect(clampScale(9)).toBe(MAX_SCALE);
    expect(clampScale(Number.NaN)).toBe(1);
  });

  it("centers the content at scale 1", () => {
    expect(clampOffset({ x: 40, y: -30 }, 1, { width: 400, height: 800 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("clamps panning to the scaled viewport edges", () => {
    expect(clampOffset({ x: 500, y: -900 }, 2, { width: 400, height: 800 })).toEqual({
      x: 200,
      y: -400,
    });
  });

  it("measures the distance between two touches", () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
  });

  it("scales from the pinch ratio", () => {
    expect(pinchScale(1, 100, 200)).toBe(2);
    expect(pinchScale(2, 100, 50)).toBe(1);
    expect(pinchScale(2, 0, 50)).toBe(2);
  });

  it("toggles between the base scale and 2x", () => {
    expect(toggleScale(1)).toBe(2);
    expect(toggleScale(2)).toBe(1);
  });
});
