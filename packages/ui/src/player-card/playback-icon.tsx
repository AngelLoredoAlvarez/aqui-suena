import { Text, XStack, YStack } from "tamagui";
import type { PlayerCardStatus } from "./player-card.types";

export type PlaybackIconKind = "play" | "pause" | "loading";

export function getPlaybackIcon(status: PlayerCardStatus): PlaybackIconKind | null {
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
    default:
      return null;
  }
}

export function PlaybackIcon({ icon }: { icon: PlaybackIconKind }) {
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
