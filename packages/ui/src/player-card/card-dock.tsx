import { useLocale } from "@aqui-suena/ui/i18n";
import { PlaybackAction } from "@aqui-suena/ui/player-card/playback-action";
import type { PlayerCardProps } from "@aqui-suena/ui/player-card/player-card.types";
import { PositionToggle } from "@aqui-suena/ui/player-card/position-toggle";
import { StationButton } from "@aqui-suena/ui/player-card/station-button";
import { StatusRow } from "@aqui-suena/ui/player-card/status-indicator";
import { useMedia, XStack, YStack } from "tamagui";

export function CardDock(props: PlayerCardProps) {
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
