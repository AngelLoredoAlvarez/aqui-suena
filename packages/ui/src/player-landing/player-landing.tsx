import { defaultStationId } from "@aqui-suena/config";
import { noopTrayBridge, type TrayBridge } from "@aqui-suena/player";
import { AdsCarousel, useAdsCarousel } from "@aqui-suena/ui/ads-carousel";
import { useLocale } from "@aqui-suena/ui/i18n";
import { LandingHeader } from "@aqui-suena/ui/player-landing/landing-header";
import { LandingSidebar } from "@aqui-suena/ui/player-landing/landing-sidebar";
import { usePlayerInsets } from "@aqui-suena/ui/player-landing/player-insets";
import { landingTopPadding } from "@aqui-suena/ui/player-landing/player-spacing";
import { selectListenerStatus } from "@aqui-suena/ui/player-landing/select-listener-status";
import { StationPlayer } from "@aqui-suena/ui/player-landing/station-player";
import { channelById } from "@aqui-suena/ui/player-landing/test-channels";
import { useListenerStatus } from "@aqui-suena/ui/player-landing/use-listener-status";
import type { PlayerCardPosition } from "@aqui-suena/ui/state";
import { playerCardPositionAtom, selectedStationIdAtom } from "@aqui-suena/ui/state";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { isWeb, Paragraph, Theme, useMedia, XStack, YStack } from "tamagui";

export type LandingScheme = "noche" | "brasa";

export function PlayerLanding({
  scheme = "noche",
  trayBridge = noopTrayBridge,
  onPositionChange,
  onSchemeChange,
  initialPosition,
}: {
  scheme?: LandingScheme;
  trayBridge?: TrayBridge;
  onPositionChange?: (position: PlayerCardPosition) => void;
  onSchemeChange?: (scheme: LandingScheme) => void;
  initialPosition?: PlayerCardPosition;
}) {
  const [mounted, setMounted] = useState(false);
  const [activeScheme, setActiveScheme] = useState<LandingScheme>(scheme);
  const [selectedStationId, setSelectedStationId] = useAtom(selectedStationIdAtom);
  const [position, setPosition] = useAtom(playerCardPositionAtom);

  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    }
  }, [initialPosition, setPosition]);

  useEffect(() => {
    setActiveScheme(scheme);
  }, [scheme]);

  const listenerQuery = useListenerStatus(defaultStationId);
  const adsQuery = useAdsCarousel();
  const { dictionary } = useLocale();
  const media = useMedia();
  const isMobile = !media.md;
  const isWebLayout = media.xl;
  const isWide = media.md;
  const insets = usePlayerInsets();
  const maxW = isWide ? 1440 : 390;
  const items = adsQuery.data ?? [];

  const listenerState = selectListenerStatus(listenerQuery);
  const channel = channelById(selectedStationId);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = (): void => {
    const next = activeScheme === "noche" ? "brasa" : "noche";

    setActiveScheme(next);
    onSchemeChange?.(next);
  };

  const player = (
    <StationPlayer
      channel={channel}
      stationName={channel.name}
      listeners={listenerState.status === "success" ? listenerState.data.listeners : null}
      onSelectStation={setSelectedStationId}
      trayBridge={trayBridge}
      onPositionChange={onPositionChange}
    />
  );

  let headerVariant: "mobile" | "tablet" | "web" = "mobile";

  if (isWebLayout) {
    headerVariant = "web";
  } else if (isWide) {
    headerVariant = "tablet";
  }

  const contentPaddingX = isWebLayout ? 24 : 12;

  if (!mounted) {
    return (
      <YStack
        flex={1}
        width="100%"
        maxW={maxW}
        mx="auto"
        bg="bg"
        pt={insets.top + 8}
        px={12}
        gap={12}
      >
        <LandingHeader variant={headerVariant} onToggleTheme={toggleTheme} />
        <Paragraph color="muted">{dictionary.loadingStation}</Paragraph>
        <AdsCarousel items={items} />
      </YStack>
    );
  }

  return (
    <Theme name={activeScheme}>
      <YStack
        testID="landing-root"
        flex={1}
        width="100%"
        maxW={maxW}
        minH={isWeb ? "100vh" : undefined}
        mx="auto"
        bg="bg"
        overflow="hidden"
        pt={insets.top + (isMobile ? 8 : 0)}
        pb={insets.bottom + (isMobile ? 16 : 12)}
      >
        <LandingHeader variant={headerVariant} onToggleTheme={toggleTheme} />

        {/* Keep the player mounted; a remount would start a second audio element. */}
        <YStack
          testID="landing-body"
          data-position={position}
          flex={1}
          minH={0}
          gap={12}
          pt={landingTopPadding(position, isWebLayout)}
          flexDirection={position === "top" ? "column-reverse" : "column"}
        >
          <YStack testID="landing-content" flex={1} minH={0} px={isMobile ? 0 : contentPaddingX}>
            {isMobile ? (
              <YStack flex={1} minH={0} mx={12} gap={12}>
                <YStack flex={1} minH={0}>
                  <AdsCarousel items={items} />
                </YStack>
              </YStack>
            ) : (
              <XStack flex={1} minH={0} gap={isWebLayout ? 20 : 16}>
                <LandingSidebar items={items} width={isWebLayout ? 380 : 300} />
                <YStack flex={1} minW={0} minH={0}>
                  <AdsCarousel items={items} />
                </YStack>
              </XStack>
            )}
          </YStack>

          {player}
        </YStack>
      </YStack>
    </Theme>
  );
}
