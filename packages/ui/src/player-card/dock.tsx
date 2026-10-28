import { useLocale } from "@aqui-suena/ui/i18n";
import { useMedia, XStack, YStack } from "tamagui";
import { PlaybackAction } from "./playback-action";
import type { PlayerCardProps } from "./player-card.types";
import { PositionToggle } from "./position-toggle";
import { StationButton } from "./station-button";
import { StatusRow } from "./status-indicator";

export function Dock(props: PlayerCardProps) {
  const {
    stationName,
    listeners,
    status,
    onResume,
    onPause,
    onOpenSheet,
    sheetOpen,
    onTogglePosition,
  } = props;
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
      {onTogglePosition ? (
        <PositionToggle label={dictionary.movePlayer} onToggle={onTogglePosition} />
      ) : null}
    </XStack>
  );
}
