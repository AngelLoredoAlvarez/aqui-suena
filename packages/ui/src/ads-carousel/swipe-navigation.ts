export type SwipeDirection = "previous" | "next" | null;

const DEFAULT_THRESHOLD_PX = 40;

/** A swipe navigates only when it moves far enough and is mostly horizontal. */
export function swipeDirection(
  dx: number,
  dy: number,
  threshold = DEFAULT_THRESHOLD_PX,
): SwipeDirection {
  if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) {
    return null;
  }

  return dx < 0 ? "next" : "previous";
}
