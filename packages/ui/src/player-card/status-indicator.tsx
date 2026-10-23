import { Paragraph, XStack } from "tamagui";
import type { PlayerCardStatus } from "./player-card.types";

export type StatusDictionary = {
  readonly playing: string;
  readonly paused: string;
  readonly loading: string;
  readonly signalUnavailable: string;
  readonly listening: (count: number) => string;
};

export function statusDotColor(
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

export function statusLabel(status: PlayerCardStatus, dictionary: StatusDictionary): string | null {
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

export function StatusRow({
  status,
  listeners,
  dictionary,
}: {
  status: PlayerCardStatus;
  listeners: number;
  dictionary: StatusDictionary;
}) {
  const dot = statusDotColor(status);
  const label = statusLabel(status, dictionary);
  const statusText =
    status === "playing" ? `${dictionary.playing} · ${dictionary.listening(listeners)}` : label;

  return (
    <XStack items="center" gap={2} minW={0}>
      {dot ? <XStack testID="status-dot" width={10} height={10} rounded={100} bg={dot} /> : null}
      {statusText ? (
        <Paragraph color="brandCreamMuted" fontSize={13} flex={1}>
          {statusText}
        </Paragraph>
      ) : null}
    </XStack>
  );
}
