import { H1, Paragraph, YStack } from "tamagui";
import { AdsCarousel } from "./ads-carousel";
import { SharedButton } from "./shared-button";

// Shared landing: the player plus the ads carousel. Rendered by `/` on web
// (apps/web/app/page.tsx) and native (apps/native/app/index.tsx) so the user
// sees playback and ads immediately on app open, with no navigation step.
// Tamagui primitives only, so both platforms render from the same code.
export function PlayerLanding() {
  return (
    <YStack flex={1} items="center" justify="center" gap="$4" p="$4">
      <H1>Aqui Suena</H1>
      <Paragraph>Live radio starts here. Press play to listen.</Paragraph>
      <SharedButton title="Play" />
      <AdsCarousel />
    </YStack>
  );
}
