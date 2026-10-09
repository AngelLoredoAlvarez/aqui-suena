import { Button, Paragraph, XStack, YStack } from "tamagui";

export type PlayerCardStatus = "playing" | "blocked" | "error";

export type StationRef = {
  readonly id: string;
  readonly name: string;
};

export type PlayerCardProps = {
  stationName: string;
  listeners: number;
  status: PlayerCardStatus;
  onResume: () => void;
  stations?: readonly StationRef[];
  onSelectStation?: (stationId: string) => void;
};

// Shared player card: station status text, blocked one-tap resume, and an
// in-place station selector. There are deliberately no station screens and
// no router imports in shared code: the player switches stations without
// navigating. The selector shows in playing/error states (an escape hatch
// when the current station fails) and stays hidden while blocked, where the
// single resume tap is the only action. Tamagui primitives only.
export function PlayerCard({
  stationName,
  listeners,
  status,
  onResume,
  stations,
  onSelectStation,
}: PlayerCardProps) {
  return (
    <YStack gap="$3" p="$4">
      <Paragraph>{stationName}</Paragraph>
      {status === "playing" ? (
        <>
          <Paragraph>Playing</Paragraph>
          <Paragraph>{listeners} listening</Paragraph>
        </>
      ) : null}
      {status === "blocked" ? (
        <Button type="button" onPress={onResume}>
          Tap to enable sound
        </Button>
      ) : null}
      {status === "error" ? <Paragraph>Signal unavailable, trying mirror…</Paragraph> : null}
      {status !== "blocked" && stations && onSelectStation ? (
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
