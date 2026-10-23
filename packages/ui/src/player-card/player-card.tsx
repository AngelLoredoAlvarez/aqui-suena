import { useLocale } from "@aqui-suena/ui/i18n";
import { Button, Paragraph, XStack } from "tamagui";

export type PlayerCardStatus = "idle" | "playing" | "paused" | "loading" | "error" | "blocked";

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
  onOpenSheet?: () => void;
};

type Dictionary = ReturnType<typeof useLocale>["dictionary"];

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
  dictionary,
  onResume,
  onPause,
}: {
  status: PlayerCardStatus;
  dictionary: Dictionary;
  onResume: () => void;
  onPause: () => void;
}) {
  switch (status) {
    case "idle":
      return (
        <Button
          type="button"
          size="md"
          rounded={999}
          bg="brandAccent hover:brandAccentHover press:brandAccentPress"
          color="brand1"
          fontWeight="700"
          paddingInline={20}
          onPress={onResume}
          aria-label={dictionary.tapToPlay}
          minH={52}
        >
          {dictionary.tapToPlay}
        </Button>
      );
    case "playing":
      return (
        <Button
          type="button"
          size="md"
          rounded={999}
          bg="brandAccent hover:brandAccentHover press:brandAccentPress"
          color="brand1"
          fontWeight="700"
          paddingInline={20}
          onPress={onPause}
          aria-label={dictionary.pause}
          minH={52}
        >
          {dictionary.pause}
        </Button>
      );
    case "paused":
      return (
        <Button
          type="button"
          size="md"
          rounded={999}
          bg="brandAccent hover:brandAccentHover press:brandAccentPress"
          color="brand1"
          fontWeight="700"
          paddingInline={20}
          onPress={onResume}
          aria-label={dictionary.resume}
          minH={52}
        >
          {dictionary.resume}
        </Button>
      );
    case "blocked":
      return (
        <Button
          type="button"
          size="md"
          rounded={999}
          paddingInline={18}
          fontSize="4"
          lineHeight="4"
          bg="brandAccent hover:brandAccentHover press:brandAccentPress"
          color="brand1"
          fontWeight="700"
          onPress={onResume}
          aria-label={dictionary.tapToEnableSound}
          minH={52}
        >
          {dictionary.tapToEnableSound}
        </Button>
      );
    case "loading":
    case "error":
      return null;
  }
}

function Dock({ stationName, listeners, status, onResume, onPause, onOpenSheet }: PlayerCardProps) {
  const { dictionary } = useLocale();
  const dot = statusDotColor(status);
  const label = statusLabel(status, dictionary);
  const statusText =
    status === "playing" ? `${dictionary.playing} · ${dictionary.listening(listeners)}` : label;

  return (
    <XStack
      testID="player-dock"
      width="100%"
      items="center"
      gap="4"
      px={16}
      py={10}
      bg="surface"
      borderColor="borderColor"
      borderWidth={1}
      rounded={20}
    >
      <PlaybackAction
        status={status}
        dictionary={dictionary}
        onResume={onResume}
        onPause={onPause}
      />
      <XStack flex={1} items="center" gap="2" minW={0}>
        {dot ? <XStack testID="status-dot" width={10} height={10} rounded={100} bg={dot} /> : null}
        {statusText ? (
          <Paragraph color="brandCreamMuted" fontSize="3" flex={1}>
            {statusText}
          </Paragraph>
        ) : null}
      </XStack>
      <StationButton stationName={stationName} onOpenSheet={onOpenSheet} />
    </XStack>
  );
}

function StationButton({
  stationName,
  onOpenSheet,
}: {
  stationName: string;
  onOpenSheet?: () => void;
}) {
  return (
    <Button
      variant="quiet"
      testID="station-name"
      onPress={() => onOpenSheet?.()}
      aria-label={stationName}
      paddingInline={14}
      paddingBlock={8}
      borderWidth={1}
      borderColor="borderColor"
      rounded={999}
      minH={44}
      gap={0}
      opacity={1}
    >
      <Paragraph fontSize="5" fontWeight="700" color="brandCream">
        {stationName}
      </Paragraph>
    </Button>
  );
}

export function PlayerCard(props: PlayerCardProps) {
  return <Dock {...props} />;
}
