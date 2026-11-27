import { swipeDirection } from "@aqui-suena/ui/ads-carousel/utils/swipe-navigation";
import { describe, expect, it } from "vitest";

describe("swipeDirection", () => {
  it("navigates to the next flyer when dragging left", () => {
    expect(swipeDirection(-120, 4)).toBe("next");
  });

  it("navigates to the previous flyer when dragging right", () => {
    expect(swipeDirection(120, -4)).toBe("previous");
  });

  it("ignores a drag below the threshold", () => {
    expect(swipeDirection(-30, 0)).toBeNull();
  });

  it("ignores a mostly vertical drag", () => {
    expect(swipeDirection(-80, 120)).toBeNull();
  });
});
