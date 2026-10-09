import { Button, Paragraph, XStack, YStack } from "tamagui";
import { useLocale } from "./i18n/locale-context";

export type PlayerCardStatus = "playing" | "paused" | "loading" | "blocked" | "error";

export type StationRef = {
  readonly id: string;
  readonly name: string;
};

export type PlayerCardProps = {
  stationName: string;
  listeners: number;
  status: PlayerCardStatus;
  onResume: () => void;
  onPause: () => void;
  stations?: readonly StationRef[];
  onSelectStation?: (stationId: string) => void;
};

// Shared player card: station status text, pause/resume affordances, blocked
// one-tap resume, and an in-place station selector. There are deliberately
// no station screens and no router imports in shared code: the player
// switches stations without navigating. The selector shows in
// playing/paused/error states (an escape hatch when the current station
// fails) and stays hidden while blocked/loading, where the single resume
// tap or the pending load is the only state. Tamagui primitives only.
export function PlayerCard({
  stationName,
  listeners,
  status,
  onResume,
  onPause,
  stations,
  onSelectStation,
}: PlayerCardProps) {
  const { dictionary } = useLocale();
  return (
    <YStack gap="$3" p="$4">
      <Paragraph>{stationName}</Paragraph>
      {status === "playing" ? (
        <>
          <Paragraph>{dictionary.playing}</Paragraph>
          <Paragraph>{dictionary.listening(listeners)}</Paragraph>
          <Button type="button" onPress={onPause}>
            {dictionary.pause}
          </Button>
        </>
      ) : null}
      {status === "paused" ? (
        <>
          <Paragraph>{dictionary.paused}</Paragraph>
          <Button type="button" onPress={onResume}>
            {dictionary.resume}
          </Button>
        </>
      ) : null}
      {status === "loading" ? <Paragraph>{dictionary.loading}</Paragraph> : null}
      {status === "blocked" ? (
        <Button type="button" onPress={onResume}>
          {dictionary.tapToEnableSound}
        </Button>
      ) : null}
      {status === "error" ? <Paragraph>{dictionary.signalUnavailable}</Paragraph> : null}
      {status !== "blocked" && status !== "loading" && stations && onSelectStation ? (
        <XStack gap="$2">
          {stations.map((station) => (
            <Button
              key={station.id}
              type="button"
              size="$2"
              onPress={() => onSelectStation(station.id)}
            >
              {station.name}
            </Button>
          ))}
        </XStack>
      ) : null}
    </YStack>
  );
}
