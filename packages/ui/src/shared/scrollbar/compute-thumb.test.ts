import { computeThumbGeometry } from "@aqui-suena/ui/shared/scrollbar/compute-thumb";
import { describe, expect, it } from "vitest";

describe("computeThumbGeometry", () => {
  it("hides the thumb when the content fits", () => {
    expect(computeThumbGeometry({ viewport: 400, content: 400, scrollOffset: 0 })).toEqual({
      offset: 0,
      size: 0,
      visible: false,
    });
  });

  it("sizes the thumb from the visible ratio", () => {
    expect(computeThumbGeometry({ viewport: 400, content: 800, scrollOffset: 0 })).toEqual({
      offset: 0,
      size: 200,
      visible: true,
    });
  });

  it("moves the thumb with the scroll offset", () => {
    expect(computeThumbGeometry({ viewport: 400, content: 800, scrollOffset: 200 }).offset).toBe(
      100,
    );
    expect(computeThumbGeometry({ viewport: 400, content: 800, scrollOffset: 400 }).offset).toBe(
      200,
    );
  });

  it("keeps a minimum thumb size on long content", () => {
    expect(computeThumbGeometry({ viewport: 100, content: 10_000, scrollOffset: 9_900 })).toEqual({
      offset: 76,
      size: 24,
      visible: true,
    });
  });

  it("clamps offsets outside the scroll range", () => {
    expect(computeThumbGeometry({ viewport: 400, content: 800, scrollOffset: -50 }).offset).toBe(0);
    expect(computeThumbGeometry({ viewport: 400, content: 800, scrollOffset: 900 }).offset).toBe(
      200,
    );
  });

  it("hides the thumb without a viewport", () => {
    expect(computeThumbGeometry({ viewport: 0, content: 800, scrollOffset: 0 }).visible).toBe(
      false,
    );
  });
});
