import { defaultStationId } from "@aqui-suena/config";
import { noopTrayBridge, type TrayBridge } from "@aqui-suena/player";
import { AdsCarousel } from "@aqui-suena/ui/ads-carousel";
import { LocaleSwitcher, useLocale } from "@aqui-suena/ui/i18n";
import { selectedStationIdAtom } from "@aqui-suena/ui/state";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { H1, isWeb, Paragraph, Theme, useMedia, XStack, YStack } from "tamagui";
import { channelById } from "./channels";
import { useListenerStatus } from "./listener-status";
import { getResponsiveMaxW } from "./responsive";
import { selectListenerStatus } from "./select-listener-status";
import { StationPlayer } from "./station-player";

export function PlayerLanding({
  scheme = "noche",
  trayBridge = noopTrayBridge,
}: {
  scheme?: "noche" | "brasa";
  trayBridge?: TrayBridge;
}) {
  const [mounted, setMounted] = useState(false);
  const [selectedStationId, setSelectedStationId] = useAtom(selectedStationIdAtom);

  const listenerQuery = useListenerStatus(defaultStationId);
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
        <AdsCarousel />
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
        position="relative"
        mx="auto"
        items={isWide ? "stretch" : "center"}
        justify={isWide ? "flex-start" : "center"}
        gap={isWide ? 16 : 20}
        px={isWide ? 24 : 20}
        py={20}
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
        {scheme === "brasa" ? player : null}
        <YStack
          testID="landing-content"
          width="100%"
          items="center"
          justify={isWide ? "center" : undefined}
          flex={isWide ? 1 : undefined}
        >
          <AdsCarousel />
        </YStack>
        {scheme === "brasa" ? null : player}
      </YStack>
    </Theme>
  );
}
