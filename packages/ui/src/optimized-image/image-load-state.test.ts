import { imageLoadState } from "@aqui-suena/ui/optimized-image/image-load-state";
import { describe, expect, it } from "vitest";

describe("imageLoadState", () => {
  it("stays pending without an element", () => {
    expect(imageLoadState(null)).toBe("pending");
  });

  it("stays pending while the browser is still loading", () => {
    expect(imageLoadState({ complete: false, naturalWidth: 0 })).toBe("pending");
  });

  it("reports loaded when the element already settled with pixels", () => {
    expect(imageLoadState({ complete: true, naturalWidth: 1200 })).toBe("loaded");
  });

  it("reports error when the element settled without pixels", () => {
    expect(imageLoadState({ complete: true, naturalWidth: 0 })).toBe("error");
  });

  it("stays pending for non-DOM image refs such as expo-image", () => {
    expect(imageLoadState({})).toBe("pending");
  });
});
