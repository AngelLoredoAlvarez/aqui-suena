export const MIN_SCALE = 1;
export const MAX_SCALE = 3;
export const DOUBLE_TAP_SCALE = 2;

export type ZoomOffset = {
  readonly x: number;
  readonly y: number;
};

export type ZoomViewport = {
  readonly width: number;
  readonly height: number;
};

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) {
    return MIN_SCALE;
  }

  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function clampAxis(value: number, max: number): number {
  const clamped = Math.min(max, Math.max(-max, value));

  return clamped === 0 ? 0 : clamped;
}

export function clampOffset(offset: ZoomOffset, scale: number, viewport: ZoomViewport): ZoomOffset {
  const maxX = Math.max(0, (viewport.width * (scale - 1)) / 2);
  const maxY = Math.max(0, (viewport.height * (scale - 1)) / 2);

  return {
    x: clampAxis(offset.x, maxX),
    y: clampAxis(offset.y, maxY),
  };
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function pinchScale(
  startScale: number,
  startDistance: number,
  nextDistance: number,
): number {
  if (!(startDistance > 0) || !Number.isFinite(nextDistance)) {
    return clampScale(startScale);
  }

  return clampScale((startScale * nextDistance) / startDistance);
}

export function toggleScale(scale: number): number {
  return scale > MIN_SCALE ? MIN_SCALE : DOUBLE_TAP_SCALE;
}
