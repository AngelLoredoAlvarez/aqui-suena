import type { PlayerCardPosition } from "@aqui-suena/ui/state";

export type PlayerInsets = {
  readonly top: number;
  readonly bottom: number;
};

export function contentTopPadding(isWebLayout: boolean): number {
  return isWebLayout ? 20 : 12;
}

export function landingTopPadding(position: PlayerCardPosition, isWebLayout: boolean): number {
  return position === "top" ? 12 : contentTopPadding(isWebLayout);
}

export function playerSpacing(isWide: boolean, insets: PlayerInsets) {
  return {
    paddingTop: (isWide ? 24 : 20) + insets.top,
    paddingBottom: (isWide ? 24 : 8) + insets.bottom,
  };
}
