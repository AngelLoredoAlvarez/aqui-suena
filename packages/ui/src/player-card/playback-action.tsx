import { PlayButton } from "@aqui-suena/ui/player-card/play-button";
import type { PlayerCardStatus } from "@aqui-suena/ui/player-card/player-card.types";

export type PlaybackActionProps = {
  readonly status: PlayerCardStatus;
  readonly onResume: () => void;
  readonly onPause: () => void;
};

export function PlaybackAction({ status, onResume, onPause }: PlaybackActionProps) {
  if (status === "error") {
    return null;
  }

  return <PlayButton status={status} onResume={onResume} onPause={onPause} />;
}
