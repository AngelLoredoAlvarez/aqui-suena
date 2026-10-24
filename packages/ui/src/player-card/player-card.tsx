import { Dock } from "./dock";
import type { PlayerCardProps } from "./player-card.types";

export { PlayButton } from "./play-button";
export { getPlaybackIcon, PlaybackIcon } from "./playback-icon";
export type { PlayerCardProps, PlayerCardStatus, StationRef } from "./player-card.types";
export type { StationButtonProps } from "./station-button";
export { StationButton } from "./station-button";
export { StatusRow, statusDotColor, statusLabel } from "./status-indicator";

export function PlayerCard(props: PlayerCardProps) {
  return <Dock {...props} />;
}
