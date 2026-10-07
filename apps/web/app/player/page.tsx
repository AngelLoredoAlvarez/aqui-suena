"use client";

import { PLAYER_ROUTE, playerPath } from "@aqui-suena/navigation";
import { SharedButton } from "@aqui-suena/ui";
import { H1, Paragraph, YStack } from "tamagui";

// Player route shell. Shared route constants come from @aqui-suena/navigation
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
