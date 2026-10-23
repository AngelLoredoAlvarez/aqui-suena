import { useLocale } from "@aqui-suena/ui/i18n";
import { getPlaybackIcon, PlaybackIcon } from "./playback-icon";
import type { PlayerCardProps, PlayerCardStatus } from "./player-card.types";
import { StationButton } from "./station-button";
import { StatusRow } from "./status-indicator";

export { getPlaybackIcon, PlaybackIcon } from "./playback-icon";
export type { PlayerCardProps, PlayerCardStatus, StationRef } from "./player-card.types";
export { StatusRow, statusDotColor, statusLabel } from "./status-indicator";

import { Button, useMedia, XStack, YStack } from "tamagui";

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

function PlaybackAction({
  status,
  onResume,
  onPause,
}: {
  status: PlayerCardStatus;
  onResume: () => void;
  onPause: () => void;
}) {
  if (status === "error") {
    return null;
  }

  return <PlayButton status={status} onResume={onResume} onPause={onPause} />;
}

function Dock({
  stationName,
  listeners,
  status,
  onResume,
  onPause,
  onOpenSheet,
  sheetOpen,
}: PlayerCardProps) {
  const { dictionary } = useLocale();
  const media = useMedia();
  const stationAriaLabel = dictionary.changeStation(stationName);
  const chevron = sheetOpen ? "▴" : "▾";

  return (
    <XStack
      testID="player-dock"
      width="100%"
      items="center"
      gap={media.md ? 16 : 12}
      px={16}
      py={10}
      bg="surface"
      borderColor="borderColor"
      borderWidth={1}
      rounded={20}
    >
      <PlaybackAction status={status} onResume={onResume} onPause={onPause} />
      <YStack flex={1} gap={6} items="flex-start">
        <StatusRow status={status} listeners={listeners} dictionary={dictionary} />
        <StationButton
          stationName={stationName}
          ariaLabel={stationAriaLabel}
          chevron={chevron}
          onOpenSheet={onOpenSheet}
        />
      </YStack>
    </XStack>
  );
}

export function PlayerCard(props: PlayerCardProps) {
  return <Dock {...props} />;
}
