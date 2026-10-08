import { defaultStationId } from "@aqui-suena/config";
import { H1, Paragraph, YStack } from "tamagui";
import { AdsCarousel } from "./ads-carousel";
import { useListenerStatus } from "./listener-status";
import { SharedButton } from "./shared-button";

// Shared landing: the player plus the ads carousel. Rendered by `/` on web
// (apps/web/app/page.tsx) and native (apps/native/app/index.tsx) so the user
// sees playback and ads immediately on app open, with no navigation step.
// The listener status comes from the shared TanStack Query hook, so both
// platforms render the same loading / error / data states.
// Tamagui primitives only, so both platforms render from the same code.
export function PlayerLanding() {
  const { data: status, isPending, isError } = useListenerStatus(defaultStationId);

  return (
    <YStack flex={1} items="center" justify="center" gap="$4" p="$4">
      <H1>Aqui Suena</H1>
      <Paragraph>Live radio starts here. Press play to listen.</Paragraph>
      {isPending ? <Paragraph>Loading station status…</Paragraph> : null}
      {isError ? <Paragraph>Station status unavailable.</Paragraph> : null}
      {status ? (
        <Paragraph>
          {status.station.name} · {status.listeners} listening
        </Paragraph>
      ) : null}
      <SharedButton title="Play" />
      <AdsCarousel />
    </YStack>
  );
}
