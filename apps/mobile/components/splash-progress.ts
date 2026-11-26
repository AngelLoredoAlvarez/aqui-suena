import { EQUALIZER_BARS } from "@aqui-suena/mobile/components/splash-bars";

export const ARC_PROGRESS_INPUT_RANGE = [0, 0.4, 1];
export const ARC_PROGRESS_OUTPUT_RANGE = [0.25, 1, 0.25];

export const FILL_PROGRESS_INPUT_RANGE = [0.05, 1];

export function fillProgressOutputRange(trackWidth: number): number[] {
  return [trackWidth * 0.05, trackWidth];
}

/**
 * Pairs the three equalizer bars with their animated values in the fixed
 * design order, so callers can render them without destructuring indices.
 */
export function zipEqualizerBars<T>(
  values: readonly [T, T, T],
): Array<{ bar: (typeof EQUALIZER_BARS)[number]; value: T }> {
  const [bar1, bar2, bar3] = values;
  const [leftBar, midBar, rightBar] = EQUALIZER_BARS;

  return [
    { bar: leftBar, value: bar1 },
    { bar: midBar, value: bar2 },
    { bar: rightBar, value: bar3 },
  ];
}
