import { CardDock } from "@aqui-suena/ui/player-card/components/card-dock";
import type { PlayerCardProps } from "@aqui-suena/ui/player-card/player-card.types";

export { PlayButton } from "@aqui-suena/ui/player-card/components/play-button";
export { getPlaybackIcon, PlaybackIcon } from "@aqui-suena/ui/player-card/components/playback-icon";
export type { StationButtonProps } from "@aqui-suena/ui/player-card/components/station-button";
export { StationButton } from "@aqui-suena/ui/player-card/components/station-button";
export {
  StatusRow,
  statusDotColor,
  statusLabel,
} from "@aqui-suena/ui/player-card/components/status-indicator";
export type {
  PlayerCardProps,
  PlayerCardStatus,
  StationRef,
} from "@aqui-suena/ui/player-card/player-card.types";

export function PlayerCard(props: PlayerCardProps) {
  return <CardDock {...props} />;
}
