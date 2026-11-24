export type FlyerLayerStyle = {
  readonly opacity: number;
  readonly x: number;
};

/** Native never fades the flyer layer: a hidden layer would hide a loaded image. */
export function flyerLayerStyle(isWeb: boolean, shown: boolean): FlyerLayerStyle {
  return {
    opacity: isWeb && !shown ? 0 : 1,
    x: shown ? 0 : 12,
  };
}
