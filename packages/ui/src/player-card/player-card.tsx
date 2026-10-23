import { useLocale } from "@aqui-suena/ui/i18n";
import type { PlayerCardProps, PlayerCardStatus } from "./player-card.types";

export type { PlayerCardProps, PlayerCardStatus, StationRef } from "./player-card.types";

import { Button, Paragraph, Text, useMedia, XStack, YStack } from "tamagui";

type Dictionary = ReturnType<typeof useLocale>["dictionary"];

export type PlaybackIcon = "play" | "pause" | "loading";

export function getPlaybackIcon(status: PlayerCardStatus): PlaybackIcon | null {
  switch (status) {
    case "playing":
      return "pause";
    case "paused":
    case "idle":
    case "blocked":
      return "play";
    case "loading":
      return "loading";
    case "error":
      return null;
  }
}

function PlaybackIcon({ icon }: { icon: PlaybackIcon }) {
  if (icon === "pause") {
    return (
      <XStack
        width={24}
        height={24}
        items="center"
        justify="center"
        gap={4}
        data-testid="playback-icon"
      >
        <YStack width={4} height={14} rounded={1} bg="onAccent" />
        <YStack width={4} height={14} rounded={1} bg="onAccent" />
      </XStack>
    );
  }

  if (icon === "play") {
    return (
      <YStack
        data-testid="playback-icon"
        width={0}
        height={0}
        borderTopWidth={7}
        borderBottomWidth={7}
        borderLeftWidth={12}
        borderTopColor="transparent"
        borderBottomColor="transparent"
        borderLeftColor="onAccent"
      />
    );
  }

  return (
    <Text
      fontSize={20}
      lineHeight={20}
      color="onAccent"
      aria-hidden={true}
      data-testid="playback-icon"
    >
      ⟳
    </Text>
  );
}

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

function statusDotColor(
  status: PlayerCardStatus,
): "brandSuccess" | "brandAccent" | "brand6" | "brandDanger" | null {
  switch (status) {
    case "idle":
      return null;
    case "playing":
      return "brandSuccess";
    case "paused":
      return "brandAccent";
    case "loading":
      return "brand6";
    case "error":
      return "brandDanger";
    case "blocked":
      return null;
  }
}

function statusLabel(status: PlayerCardStatus, dictionary: Dictionary): string | null {
  switch (status) {
    case "playing":
      return dictionary.playing;
    case "paused":
      return dictionary.paused;
    case "loading":
      return dictionary.loading;
    case "error":
      return dictionary.signalUnavailable;
    case "idle":
    case "blocked":
      return null;
  }
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
  const dot = statusDotColor(status);
  const label = statusLabel(status, dictionary);
  const statusText =
    status === "playing" ? `${dictionary.playing} · ${dictionary.listening(listeners)}` : label;

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
        <XStack items="center" gap={2} minW={0}>
          {dot ? (
            <XStack testID="status-dot" width={10} height={10} rounded={100} bg={dot} />
          ) : null}
          {statusText ? (
            <Paragraph color="brandCreamMuted" fontSize={13} flex={1}>
              {statusText}
            </Paragraph>
          ) : null}
        </XStack>
        <StationButton stationName={stationName} onOpenSheet={onOpenSheet} sheetOpen={sheetOpen} />
      </YStack>
    </XStack>
  );
}

function StationButton({
  stationName,
  onOpenSheet,
  sheetOpen,
}: {
  stationName: string;
  onOpenSheet?: () => void;
  sheetOpen?: boolean;
}) {
  const { dictionary } = useLocale();

  return (
    <Button
      variant="quiet"
      testID="station-name"
      onPress={() => onOpenSheet?.()}
      aria-haspopup="listbox"
      aria-label={dictionary.changeStation(stationName)}
      paddingInline={0}
      paddingBlock={0}
      borderWidth={0}
      minH={32}
      gap={6}
      opacity={1}
    >
      <Paragraph fontSize={17} fontWeight="700" color="brandCream">
        {stationName}
      </Paragraph>
      <Text fontSize={18} color="brandCream" aria-hidden={true} data-testid="station-chevron">
        {sheetOpen ? "▴" : "▾"}
      </Text>
    </Button>
  );
}

export function PlayerCard(props: PlayerCardProps) {
  return <Dock {...props} />;
}
