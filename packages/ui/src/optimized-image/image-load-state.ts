/**
 * Outcome the browser already decided for an image element. A warm-cache image
 * can settle before hydration attaches `load`, so the element is the only
 * source of truth. Non-DOM refs (expo-image) expose neither field and stay
 * pending.
 */
export type ImageLoadState = "loaded" | "error" | "pending";

export type SettledImageElement = {
  readonly complete?: boolean | undefined;
  readonly naturalWidth?: number | undefined;
};

export function imageLoadState(image: SettledImageElement | null): ImageLoadState {
  if (image?.complete !== true) {
    return "pending";
  }

  return (image.naturalWidth ?? 0) > 0 ? "loaded" : "error";
}
