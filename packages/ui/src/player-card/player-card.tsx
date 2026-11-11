import { CardDock } from "@aqui-suena/ui/player-card/card-dock";
import type { PlayerCardProps } from "@aqui-suena/ui/player-card/player-card.types";

export { PlayButton } from "@aqui-suena/ui/player-card/play-button";
export { getPlaybackIcon, PlaybackIcon } from "@aqui-suena/ui/player-card/playback-icon";
export type {
  PlayerCardProps,
  PlayerCardStatus,
  StationRef,
} from "@aqui-suena/ui/player-card/player-card.types";
export type { StationButtonProps } from "@aqui-suena/ui/player-card/station-button";
export { StationButton } from "@aqui-suena/ui/player-card/station-button";
export {
  StatusRow,
  statusDotColor,
  statusLabel,
} from "@aqui-suena/ui/player-card/status-indicator";

export function PlayerCard(props: PlayerCardProps) {
  return <CardDock {...props} />;
}
