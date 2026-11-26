import {
  ARC_PROGRESS_INPUT_RANGE,
  ARC_PROGRESS_OUTPUT_RANGE,
  FILL_PROGRESS_INPUT_RANGE,
  fillProgressOutputRange,
  zipEqualizerBars,
} from "@aqui-suena/mobile/components/splash-progress";
import { describe, expect, it } from "vitest";

describe("splash-progress", () => {
  it("fades the arcs in and out over the full motion cycle", () => {
    expect(ARC_PROGRESS_INPUT_RANGE).toEqual([0, 0.4, 1]);
    expect(ARC_PROGRESS_OUTPUT_RANGE).toEqual([0.25, 1, 0.25]);
  });

  it("scales the fill from 5% of the track to full width", () => {
    expect(FILL_PROGRESS_INPUT_RANGE).toEqual([0.05, 1]);

    const wide = fillProgressOutputRange(176);
    expect(wide[0]).toBeCloseTo(8.8, 10);
    expect(wide[1]).toBe(176);

    const compact = fillProgressOutputRange(126);
    expect(compact[0]).toBeCloseTo(6.3, 10);
    expect(compact[1]).toBe(126);
  });

  it("zips the three bars to their animated values in design order", () => {
    const zipped = zipEqualizerBars(["a", "b", "c"]);

    expect(zipped.map(({ bar }) => bar)).toEqual([
      { x: 442, height: 90 },
      { x: 494, height: 150 },
      { x: 546, height: 110 },
    ]);
    expect(zipped.map(({ value }) => value)).toEqual(["a", "b", "c"]);
  });
});
