import { Button, Paragraph, YStack } from "tamagui";

export type PlayerCardStatus = "playing" | "blocked" | "error";

export type PlayerCardProps = {
  stationName: string;
  listeners: number;
  status: PlayerCardStatus;
  onResume: () => void;
  onOpen?: () => void;
};

// Shared player card: station status text and blocked one-tap resume.
// Navigation stays out of shared code on purpose: Solito's Link needs the
// classic React Navigation container, which Expo Router 57 does not provide
// (it vendors forked primitives). Apps pass onOpen wired to their own
// router; the deep-link route contract lives in packages/navigation for
// the task that creates those screens. Tamagui primitives only.
export function PlayerCard({ stationName, listeners, status, onResume, onOpen }: PlayerCardProps) {
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
      {onOpen ? <Paragraph onPress={onOpen}>Open</Paragraph> : null}
    </YStack>
  );
}
