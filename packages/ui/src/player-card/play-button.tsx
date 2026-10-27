import { useLocale } from "@aqui-suena/ui/i18n";
import { Button, YStack } from "tamagui";
import { getPlaybackIcon, PlaybackIcon } from "./playback-icon";
import type { PlayerCardStatus } from "./player-card.types";
import { usePulse } from "./use-pulse";

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
  const pulsing = usePulse(status === "playing");

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

  const isPlaying = status === "playing";

  return (
    <Button
      type="button"
      aria-label={label}
      data-playing={isPlaying ? "true" : undefined}
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
      onPress={isPlaying ? onPause : onResume}
      disabled={status === "loading"}
      opacity={status === "loading" ? 0.5 : 1}
      position="relative"
    >
      {isPlaying && (
        <YStack
          position="absolute"
          width={64 + 8}
          height={64 + 8}
          rounded={36}
          borderWidth={4}
          borderColor="surface2"
          opacity={pulsing ? 0.45 : 1}
          transition="medium"
          pointerEvents="none"
        />
      )}
      <PlaybackIcon icon={icon} />
    </Button>
  );
}
