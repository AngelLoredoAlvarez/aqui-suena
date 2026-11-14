export type PlayerInsets = {
  readonly top: number;
  readonly bottom: number;
};

export function playerSpacing(isWide: boolean, insets: PlayerInsets) {
  return {
    paddingTop: (isWide ? 24 : 20) + insets.top,
    paddingBottom: (isWide ? 24 : 8) + insets.bottom,
  };
}
