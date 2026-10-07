import { PLAYER_ROUTE, playerPath } from "@aqui-suena/navigation";
import { SharedButton } from "@aqui-suena/ui";
import { H1, Paragraph, YStack } from "tamagui";

// Player route shell for Expo Router. Same shared button and route
// constants as the web /player page; playback UI lands in Tasks 4-7.
export default function PlayerScreen() {
  return (
    <YStack flex={1} items="center" justify="center" gap="$4" p="$4">
      <H1>Player</H1>
      <Paragraph>Shared route: {PLAYER_ROUTE}</Paragraph>
      <SharedButton title={`Open ${playerPath()}`} />
    </YStack>
  );
}
