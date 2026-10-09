import { defaultStationId } from "@aqui-suena/config";
import type { AudioDriver } from "@aqui-suena/player";
import { usePlayer } from "@aqui-suena/player";
import { H1, Paragraph, YStack } from "tamagui";
import { AdsCarousel } from "./ads-carousel";
import { useListenerStatus } from "./listener-status";
import { PlayerCard } from "./player-card";

// Temporary visual wiring until expo-audio lands (Tasks 6-7): no real
// audio yet, so the driver resolves immediately and the landing shows the
// playing card. Blocked/error states are proven by unit tests meanwhile.
const PLACEHOLDER_STREAM_URL = "https://stream.example.com/live";

const noopDriver: AudioDriver = {
  play: async () => {},
};

// Shared landing: the player plus the ads carousel. Rendered by `/` on web
// (apps/web/app/page.tsx) and native (apps/native/app/index.tsx) so the user
// sees playback and ads immediately on app open, with no navigation step.
// Tamagui primitives only, so both platforms render from the same code.
export function PlayerLanding() {
  const { status, resume } = usePlayer({ urls: [PLACEHOLDER_STREAM_URL], driver: noopDriver });
  const { data: listener } = useListenerStatus(defaultStationId);

  if (status === "idle" || status === "loading" || !listener) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4" p="$4">
        <Paragraph>Loading station status…</Paragraph>
        <AdsCarousel />
      </YStack>
    );
  }

  return (
    <YStack flex={1} items="center" justify="center" gap="$4" p="$4">
      <H1>Aqui Suena</H1>
      <PlayerCard
        stationName={listener.station.name}
        listeners={listener.listeners}
        status={status}
        stationId={listener.station.id}
        onResume={resume}
      />
      <AdsCarousel />
    </YStack>
  );
}
