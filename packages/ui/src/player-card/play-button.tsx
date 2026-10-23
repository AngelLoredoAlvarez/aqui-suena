import { useLocale } from "@aqui-suena/ui/i18n";
import { Button } from "tamagui";
import { getPlaybackIcon, PlaybackIcon } from "./playback-icon";
import type { PlayerCardStatus } from "./player-card.types";

export function PlayButton({
  status,
  onResume,
  onPause,
}: {
  status: PlayerCardStatus;
  onResume: () => void;
  onPause: () => void;
}) {
  const { dictionary } = useLocale();
  const icon = getPlaybackIcon(status);

  if (!icon) {
    return null;
  }

  const label =
    status === "playing"
      ? dictionary.pause
      : status === "paused"
        ? dictionary.resume
        : status === "idle"
          ? dictionary.tapToPlay
          : status === "blocked"
            ? dictionary.tapToEnableSound
            : dictionary.loading;

  return (
    <Button
      type="button"
      aria-label={label}
      width={64}
      height={64}
      rounded={32}
      borderWidth={0}
      bg="accent"
      color="onAccent"
      paddingInline={0}
      paddingBlock={0}
      m={6}
      shadowColor="surface2"
      shadowRadius={6}
      shadowOffset={{ width: 0, height: 0 }}
      onPress={status === "playing" ? onPause : onResume}
      disabled={status === "loading"}
      opacity={status === "loading" ? 0.5 : 1}
    >
      <PlaybackIcon icon={icon} />
    </Button>
  );
}
