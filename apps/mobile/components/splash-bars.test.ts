import { describe, expect, it } from "vitest";
import {
  BAR_CORNER_RADIUS,
  BAR_WIDTH,
  barCenterY,
  EQUALIZER_BARS,
  SPEAKER_CENTER_Y,
} from "./splash-bars";

describe("splash-bars", () => {
  it("anchors the equalizer to the speaker body center", () => {
    expect(SPEAKER_CENTER_Y).toBe(597);
  });

  it("defines three bars with the designed x and height", () => {
    expect(EQUALIZER_BARS).toEqual([
      { x: 442, height: 90 },
      { x: 494, height: 150 },
      { x: 546, height: 110 },
    ]);
  });

  it("keeps a uniform bar width and corner radius", () => {
    expect(BAR_WIDTH).toBe(36);
    expect(BAR_CORNER_RADIUS).toBe(18);
  });

  it("centers each bar on the speaker center as it grows", () => {
    expect(barCenterY(150, 1)).toBe(522);
    expect(barCenterY(90, 0.55)).toBe(572.25);
    expect(barCenterY(110, 0)).toBe(597);
  });
});
