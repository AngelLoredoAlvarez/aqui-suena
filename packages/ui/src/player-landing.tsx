import { defaultStationId } from "@aqui-suena/config";
import { STREAM_FALLBACK_URLS, usePlayer } from "@aqui-suena/player";
import { H1, Paragraph, YStack } from "tamagui";
import { AdsCarousel } from "./ads-carousel";
import { useExpoAudioDriver } from "./expo-driver";
import { useLocale } from "./i18n/locale-context";
import { LocaleSwitcher } from "./i18n/locale-switcher";
import { useListenerStatus } from "./listener-status";
import { PlayerCard } from "./player-card";

// Shared landing: the player plus the ads carousel. Rendered by `/` on web
// (apps/web/app/page.tsx) and native (apps/native/app/index.tsx) so the user
// sees playback and ads immediately on app open, with no navigation step.
// Audio comes from the shared expo-audio driver (Tasks 6-7); the stream
// chain is temporary until the own station exists.
// Tamagui primitives only, so both platforms render from the same code.
export function PlayerLanding() {
  const driver = useExpoAudioDriver();
  const { status, pause, resume } = usePlayer({ urls: [...STREAM_FALLBACK_URLS], driver });
  const { data: listener } = useListenerStatus(defaultStationId);
  const { dictionary } = useLocale();

  if (status === "idle" || status === "loading" || !listener) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4" p="$4">
        <H1>{dictionary.appTitle}</H1>
        <Paragraph>{dictionary.loadingStation}</Paragraph>
        <LocaleSwitcher />
        <AdsCarousel />
      </YStack>
    );
  }

  return (
    <YStack flex={1} items="center" justify="center" gap="$4" p="$4">
      <H1>{dictionary.appTitle}</H1>
      <PlayerCard
        stationName={listener.station.name}
        listeners={listener.listeners}
        status={status}
        onResume={resume}
        onPause={pause}
      />
      <LocaleSwitcher />
      <AdsCarousel />
    </YStack>
  );
}
