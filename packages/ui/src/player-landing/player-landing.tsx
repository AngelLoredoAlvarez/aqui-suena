import { defaultStationId } from "@aqui-suena/config";
import { noopTrayBridge, type TrayBridge } from "@aqui-suena/player";
import { AdsCarousel } from "@aqui-suena/ui/ads-carousel";
import { LocaleSwitcher, useLocale } from "@aqui-suena/ui/i18n";
import type { PlayerCardPosition } from "@aqui-suena/ui/state";
import { playerCardPositionAtom, selectedStationIdAtom } from "@aqui-suena/ui/state";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { H1, isWeb, Paragraph, Theme, useMedia, XStack, YStack } from "tamagui";
import { useAdsCarousel } from "./ads-status";
import { channelById } from "./channels";
import { useListenerStatus } from "./listener-status";
import { getResponsiveMaxW } from "./responsive";
import { selectListenerStatus } from "./select-listener-status";
import { StationPlayer } from "./station-player";

export function PlayerLanding({
  scheme = "noche",
  trayBridge = noopTrayBridge,
  onPositionChange,
  initialPosition,
}: {
  scheme?: "noche" | "brasa";
  trayBridge?: TrayBridge;
  onPositionChange?: (position: PlayerCardPosition) => void;
  initialPosition?: PlayerCardPosition;
}) {
  const [mounted, setMounted] = useState(false);
  const [selectedStationId, setSelectedStationId] = useAtom(selectedStationIdAtom);
  const [position, setPosition] = useAtom(playerCardPositionAtom);

  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    }
  }, [initialPosition, setPosition]);

  const listenerQuery = useListenerStatus(defaultStationId);
  const adsQuery = useAdsCarousel();
  const { dictionary } = useLocale();
  const media = useMedia();
  const isWide = media.md;
  const responsiveMaxW = getResponsiveMaxW(media);

  const listenerState = selectListenerStatus(listenerQuery);
  const channel = channelById(selectedStationId);

  useEffect(() => {
    setMounted(true);
  }, []);

  const player = (
    <StationPlayer
      channel={channel}
      stationName={channel.name}
      listeners={listenerState.status === "success" ? listenerState.data.listeners : 0}
      onSelectStation={setSelectedStationId}
      trayBridge={trayBridge}
      onPositionChange={onPositionChange}
    />
  );

  if (!mounted || listenerState.status !== "success") {
    return (
      <YStack
        flex={1}
        width="100%"
        maxW={responsiveMaxW}
        mx="auto"
        items={isWide ? "stretch" : "center"}
        justify="center"
        gap={20}
        p={isWide ? 24 : 20}
        bg="bg"
      >
        <H1 color="brandCream">{dictionary.appTitle}</H1>
        <Paragraph color="brandCreamMuted">{dictionary.loadingStation}</Paragraph>
        <LocaleSwitcher />
        <AdsCarousel items={adsQuery.data ?? []} />
      </YStack>
    );
  }

  return (
    <Theme name={scheme}>
      <YStack
        flex={1}
        width="100%"
        maxW={responsiveMaxW}
        minH={isWeb ? "100vh" : undefined}
        overflow="hidden"
        position="relative"
        mx="auto"
        items={isWide ? "stretch" : "center"}
        justify="flex-start"
        gap={isWide ? 16 : 20}
        px={isWide ? 24 : 20}
        pt={isWide ? 24 : 20}
        pb={isWide ? 24 : 8}
        bg="bg"
      >
        {isWide ? (
          <XStack width="100%" items="center" justify="space-between" gap="4">
            <H1 color="brandCream">{dictionary.appTitle}</H1>
            <LocaleSwitcher />
          </XStack>
        ) : (
          <>
            <H1 color="brandCream">{dictionary.appTitle}</H1>
            <LocaleSwitcher />
          </>
        )}
        {position === "bottom" ? (
          <YStack
            testID="landing-content"
            width="100%"
            items="center"
            justify={isWide ? "center" : undefined}
            flex={1}
          >
            <AdsCarousel items={adsQuery.data ?? []} />
          </YStack>
        ) : null}
        {player}
        {position === "top" ? (
          <YStack
            testID="landing-content"
            width="100%"
            items="center"
            justify={isWide ? "center" : undefined}
            flex={1}
          >
            <AdsCarousel items={adsQuery.data ?? []} />
          </YStack>
        ) : null}
      </YStack>
    </Theme>
  );
}
