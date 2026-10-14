import { useLocale } from "@aqui-suena/ui/i18n";
import { Button, Paragraph, XStack, YStack } from "tamagui";

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
//
// Visual language: night-plum card surface with cream text, a status dot
// (green playing, amber paused, neutral loading, red error; blocked keeps
// its single tap with no dot), and a prominent round amber pause/resume
// affordance. All copy comes from the shared dictionary (both locales).
function statusDotColor(
  status: PlayerCardStatus,
): "$brandSuccess" | "$brandAccent" | "$brand6" | "$brandDanger" | null {
  switch (status) {
    case "playing":
      return "$brandSuccess";
    case "paused":
      return "$brandAccent";
    case "loading":
      return "$brand6";
    case "error":
      return "$brandDanger";
    case "blocked":
      return null;
  }
}

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
  const dot = statusDotColor(status);
  return (
    <YStack
      gap="$4"
      p="$5"
      width="100%"
      maxW={480}
      bg="$brand2"
      borderColor="$brand5"
      borderWidth={1}
      rounded="$6"
    >
      <Paragraph fontSize="$8" fontWeight="700" color="$brandCream">
        {stationName}
      </Paragraph>
      {status === "playing" ? (
        <>
          <XStack gap="$2" items="center">
            {dot ? (
              <XStack testID="status-dot" width={12} height={12} rounded={100} bg={dot} />
            ) : null}
            <Paragraph color="$brandCreamMuted">{dictionary.playing}</Paragraph>
          </XStack>
          <Paragraph color="$brandCreamMuted">{dictionary.listening(listeners)}</Paragraph>
          <Button
            type="button"
            size="$5"
            rounded={999}
            bg="$brandAccent"
            color="$brand1"
            fontWeight="700"
            hoverStyle={{ bg: "$brandAccentHover" }}
            pressStyle={{ bg: "$brandAccentPress" }}
            onPress={onPause}
            aria-label={dictionary.pause}
          >
            {dictionary.pause}
          </Button>
        </>
      ) : null}
      {status === "paused" ? (
        <>
          <XStack gap="$2" items="center">
            {dot ? (
              <XStack testID="status-dot" width={12} height={12} rounded={100} bg={dot} />
            ) : null}
            <Paragraph color="$brandCreamMuted">{dictionary.paused}</Paragraph>
          </XStack>
          <Button
            type="button"
            size="$5"
            rounded={999}
            bg="$brandAccent"
            color="$brand1"
            fontWeight="700"
            hoverStyle={{ bg: "$brandAccentHover" }}
            pressStyle={{ bg: "$brandAccentPress" }}
            onPress={onResume}
            aria-label={dictionary.resume}
          >
            {dictionary.resume}
          </Button>
        </>
      ) : null}
      {status === "loading" ? (
        <XStack gap="$2" items="center">
          {dot ? (
            <XStack testID="status-dot" width={12} height={12} rounded={100} bg={dot} />
          ) : null}
          <Paragraph color="$brandCreamMuted">{dictionary.loading}</Paragraph>
        </XStack>
      ) : null}
      {status === "blocked" ? (
        <Button
          type="button"
          size="$4"
          rounded={999}
          bg="$brandAccent"
          color="$brand1"
          fontWeight="700"
          hoverStyle={{ bg: "$brandAccentHover" }}
          pressStyle={{ bg: "$brandAccentPress" }}
          onPress={onResume}
          aria-label={dictionary.tapToEnableSound}
        >
          {dictionary.tapToEnableSound}
        </Button>
      ) : null}
      {status === "error" ? (
        <XStack gap="$2" items="center">
          {dot ? (
            <XStack testID="status-dot" width={12} height={12} rounded={100} bg={dot} />
          ) : null}
          <Paragraph color="$brandCreamMuted">{dictionary.signalUnavailable}</Paragraph>
        </XStack>
      ) : null}
      {status !== "blocked" && status !== "loading" && stations && onSelectStation ? (
        <XStack gap="$2" flexWrap="wrap" testID="station-selector">
          {stations.map((station) => (
            <Button
              key={station.id}
              type="button"
              size="$2"
              rounded={999}
              bg="$brand3"
              borderColor="$brand5"
              borderWidth={1}
              color="$brandCream"
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
