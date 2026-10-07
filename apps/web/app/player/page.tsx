import { PLAYER_ROUTE, playerPath } from "@aqui/navigation";
import { SharedButton } from "@aqui/ui";
import { H1, Paragraph, YStack } from "tamagui";

export const metadata = {
  title: "Player - Aqui Suena",
  description: "Aqui Suena player shell",
};

// Player route shell. Shared route constants come from @aqui/navigation
// (Solito is the cross-platform navigation API); playback UI lands in
// Tasks 4-7.
export default function PlayerPage() {
  return (
    <YStack flex={1} items="center" justify="center" gap="$4" p="$4">
      <H1>Player</H1>
      <Paragraph>Shared route: {PLAYER_ROUTE}</Paragraph>
      <SharedButton title={`Open ${playerPath()}`} />
    </YStack>
  );
}
