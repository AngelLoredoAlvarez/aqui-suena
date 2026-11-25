export const SPEAKER_CENTER_Y = 597;

export const BAR_WIDTH = 36;
export const BAR_CORNER_RADIUS = 18;

// A fixed 3-tuple so callers can destructure it without index guards.
export const EQUALIZER_BARS = [
  { x: 442, height: 90 },
  { x: 494, height: 150 },
  { x: 546, height: 110 },
] as const;

// The speaker body spans y=475..720 (rect y=475, height=245), so its vertical
// center is 597.5. Each bar hangs from that center, so taller bars grow in both
// directions and the waveform stays anchored while it animates.
export function barCenterY(height: number, progress: number): number {
  return SPEAKER_CENTER_Y - (height * progress) / 2;
}
