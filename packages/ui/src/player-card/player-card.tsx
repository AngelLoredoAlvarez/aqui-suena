import { useLocale } from "@aqui-suena/ui/i18n";
import { Button, Paragraph, XStack, YStack } from "tamagui";

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

export function PlayerCard({
  stationName,
  listeners,
  status,
  onResume,
  onPause,
  onOpenSheet,
}: PlayerCardProps) {
  const { dictionary } = useLocale();
  const dot = statusDotColor(status);

  return (
    <YStack
      testID="player-dock"
      gap="4"
      p={12}
      mt="auto"
      width="100%"
      maxW={480}
      bg="surface"
      borderColor="borderColor"
      borderWidth={1}
      rounded={24}
    >
      <Button
        variant="quiet"
        testID="station-name"
        onPress={() => onOpenSheet?.()}
        aria-label={stationName}
        width="100%"
        justifyContent="flex-start"
        paddingInline={6}
        paddingBlock={1}
        borderWidth={0}
        minHeight={0}
        gap={0}
        opacity={1}
      >
        <Paragraph width="100%" textAlign="center" fontSize="8" fontWeight="700" color="brandCream">
          {stationName}
        </Paragraph>
      </Button>
      {status === "idle" ? (
        <Button
          type="button"
          size="lg"
          rounded={999}
          bg="brandAccent hover:brandAccentHover press:brandAccentPress"
          color="brand1"
          fontWeight="700"
          onPress={onResume}
          aria-label={dictionary.tapToPlay}
          minH={52}
        >
          {dictionary.tapToPlay}
        </Button>
      ) : null}
      {status === "playing" ? (
        <>
          <XStack gap="2" items="center">
            {dot ? (
              <XStack testID="status-dot" width={12} height={12} rounded={100} bg={dot} />
            ) : null}
            <Paragraph color="brandCreamMuted">{dictionary.playing}</Paragraph>
          </XStack>
          <Paragraph color="brandCreamMuted">{dictionary.listening(listeners)}</Paragraph>
          <Button
            type="button"
            size="lg"
            rounded={999}
            bg="brandAccent hover:brandAccentHover press:brandAccentPress"
            color="brand1"
            fontWeight="700"
            onPress={onPause}
            aria-label={dictionary.pause}
            minH={52}
          >
            {dictionary.pause}
          </Button>
        </>
      ) : null}
      {status === "paused" ? (
        <>
          <XStack gap="2" items="center">
            {dot ? (
              <XStack testID="status-dot" width={12} height={12} rounded={100} bg={dot} />
            ) : null}
            <Paragraph color="brandCreamMuted">{dictionary.paused}</Paragraph>
          </XStack>
          <Button
            type="button"
            size="lg"
            rounded={999}
            bg="brandAccent hover:brandAccentHover press:brandAccentPress"
            color="brand1"
            fontWeight="700"
            onPress={onResume}
            aria-label={dictionary.resume}
            minH={52}
          >
            {dictionary.resume}
          </Button>
        </>
      ) : null}
      {status === "loading" ? (
        <XStack gap="2" items="center">
          {dot ? (
            <XStack testID="status-dot" width={12} height={12} rounded={100} bg={dot} />
          ) : null}
          <Paragraph color="brandCreamMuted">{dictionary.loading}</Paragraph>
        </XStack>
      ) : null}
      {status === "error" ? (
        <XStack gap="2" items="center">
          {dot ? (
            <XStack testID="status-dot" width={12} height={12} rounded={100} bg={dot} />
          ) : null}
          <Paragraph color="brandCreamMuted">{dictionary.signalUnavailable}</Paragraph>
        </XStack>
      ) : null}
      {status === "blocked" ? (
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
      ) : null}
    </YStack>
  );
}
