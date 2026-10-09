import { playerPath } from "@aqui-suena/navigation";
import { Link } from "solito/link";
import { Button, Paragraph, YStack } from "tamagui";

export type PlayerCardStatus = "playing" | "blocked" | "error";

export type PlayerCardProps = {
  stationName: string;
  listeners: number;
  status: PlayerCardStatus;
  stationId: string;
  onResume: () => void;
};

// Shared player card: station status text, blocked one-tap resume, deep
// link to the station route. Tamagui primitives + Solito Link only, so web
// and native render the same card from this code. Status and message copy
// mirror the error-mapper contract.
export function PlayerCard({
  stationName,
  listeners,
  status,
  stationId,
  onResume,
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
      <Link href={playerPath(stationId)}>
        <Paragraph>Open</Paragraph>
      </Link>
    </YStack>
  );
}
