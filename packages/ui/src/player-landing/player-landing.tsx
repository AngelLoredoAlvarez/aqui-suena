import { defaultStationId } from "@aqui-suena/config";
import {
  noopTrayBridge,
  type TrayBridge,
  type TrayLabels,
  usePlayer,
  useTraySync,
} from "@aqui-suena/player";
import { AdsCarousel } from "@aqui-suena/ui/ads-carousel";
import { streamBaseUrl, useExpoAudioDriver } from "@aqui-suena/ui/drivers";
import { LocaleSwitcher, useLocale } from "@aqui-suena/ui/i18n";
import { PlayerCard } from "@aqui-suena/ui/player-card";
import { selectedStationIdAtom } from "@aqui-suena/ui/state";
import {
  StationSheetBackdrop,
  StationSheetCard,
  useEscapeToClose,
} from "@aqui-suena/ui/station-sheet";
import { useAtom } from "jotai";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { H1, isWeb, Paragraph, Theme, useMedia, XStack, YStack } from "tamagui";
import { useListenerStatus } from "./listener-status";
import { getResponsiveMaxW } from "./responsive";
import { selectListenerStatus } from "./select-listener-status";

type TestChannel = {
  id: string;
  name: string;
  // Primary first, then mirrors: usePlayer walks this list on failure. Every
  // dev channel ships the same asset twice (the primary path and a distinct
  // mirror URL) so the fallback chain is reachable end-to-end; production
  // station data supplies real mirror hosts instead.
  urls: string[];
};

function channelUrls(file: string): string[] {
  const primary = `${streamBaseUrl}/test-streams/${file}`;

  return [primary, `${primary}?mirror=1`];
}

const DEFAULT_CHANNEL: TestChannel = {
  id: "test-pop",
  name: "Test Pop",
  urls: channelUrls("test-pop.m4a"),
};

const TEST_CHANNELS: readonly TestChannel[] = [
  DEFAULT_CHANNEL,
  { id: "test-jingle", name: "Test Jingle", urls: channelUrls("test-jingle.m4a") },
  { id: "test-night", name: "Test Night", urls: channelUrls("test-night.m4a") },
];

// Catalog liveness lands with real permissions; every dev channel plays today.
const STATIONS = TEST_CHANNELS.map(({ id, name }) => ({ id, name, live: true }));

function channelById(id: string): TestChannel {
  return TEST_CHANNELS.find((channel) => channel.id === id) ?? DEFAULT_CHANNEL;
}

function PlayerDock({
  isWide,
  sheet,
  children,
}: {
  isWide: boolean;
  sheet: ReactNode;
  children: ReactNode;
}) {
  if (isWide) {
    return (
      <YStack width="100%" mt="auto" position="relative">
        {sheet ? (
          <YStack
            position="absolute"
            b={112}
            l={100}
            r="auto"
            width={320}
            items="stretch"
            z={4}
            pointerEvents="none"
          >
            {sheet}
          </YStack>
        ) : null}
        {children}
      </YStack>
    );
  }

  return (
    <YStack position="absolute" b="5" l={0} r={0} z={2}>
      {sheet ? (
        <YStack position="absolute" b={118} l={0} r={0} z={4} pointerEvents="none">
          {sheet}
        </YStack>
      ) : null}
      {children}
    </YStack>
  );
}

function StationPlayer({
  channel,
  stationName,
  listeners,
  onSelectStation,
  trayBridge,
}: {
  channel: TestChannel;
  stationName: string;
  listeners: number;
  onSelectStation: (stationId: string) => void;
  trayBridge: TrayBridge;
}) {
  const [committedChannel, setCommittedChannel] = useState(channel);
  const [sheetOpen, setSheetOpen] = useState(false);

  const driver = useExpoAudioDriver();
  const { dictionary } = useLocale();
  const media = useMedia();
  const isWide = media.md;
  const { status, activeUrl, pause, resume } = usePlayer({
    urls: channel.urls,
    driver,
    nowPlaying: { title: channel.name, artist: dictionary.appTitle },
  });

  // Backdrop lives at column level for full coverage while the card stays
  // in the bottom-anchored wrapper above the dock; one backdrop+card pair
  // shared by every loaded branch so a tap during switching opens
  // immediately instead of popping up later.
  const closeSheet = (): void => {
    setSheetOpen(false);
  };

  const handleSelectStation = useCallback(
    (stationId: string): void => {
      onSelectStation(stationId);
    },
    [onSelectStation],
  );

  const handleTogglePlayback = useCallback((): void => {
    if (status === "playing") {
      pause();
    } else {
      resume();
    }
  }, [status, pause, resume]);

  const trayLabels = useMemo<TrayLabels>(
    () => ({
      play: dictionary.trayPlay,
      pause: dictionary.trayPause,
      stations: dictionary.trayStations,
      closeToTray: dictionary.trayCloseToTray,
      toggleWindow: dictionary.trayToggleWindow,
      quit: dictionary.trayQuit,
    }),
    [dictionary],
  );

  useTraySync({
    bridge: trayBridge,
    status,
    labels: trayLabels,
    stations: STATIONS,
    activeStationId: committedChannel.id,
    onTogglePlayback: handleTogglePlayback,
    onSelectStation: handleSelectStation,
  });

  useEscapeToClose(sheetOpen, closeSheet);

  const sheetBackdrop = (
    <StationSheetBackdrop
      onClose={closeSheet}
      dim={!isWide}
      zIndex={isWide ? 3 : 1}
      bottom={isWide ? 0 : 106}
    />
  );

  const sheetCard = (
    <StationSheetCard
      stations={STATIONS}
      activeStationId={channel.id}
      onSelectStation={handleSelectStation}
      onClose={closeSheet}
    />
  );

  const sheet = sheetOpen ? sheetCard : null;
  const backdrop = sheetOpen ? sheetBackdrop : null;

  useEffect(() => {
    // A fallback can settle on any mirror, so the committed channel must
    // accept every URL it owns. Matching only the primary would leave
    // `switching` stuck true and keep the previous station card on screen
    // while the new station actually plays.
    if (status === "playing" && activeUrl !== null && channel.urls.includes(activeUrl)) {
      setCommittedChannel(channel);
    }
  }, [status, channel, activeUrl]);

  const switching =
    activeUrl !== null &&
    channel.id !== committedChannel.id &&
    (status === "playing" || status === "loading" || status === "idle");

  if (status === "loading" || switching) {
    if (switching) {
      return (
        <>
          {backdrop}
          <PlayerDock isWide={isWide} sheet={sheet}>
            <PlayerCard
              stationName={committedChannel.name}
              listeners={listeners}
              status="playing"
              onResume={resume}
              onPause={pause}
              onOpenSheet={() => setSheetOpen(true)}
              sheetOpen={sheetOpen}
            />
          </PlayerDock>
        </>
      );
    }

    return (
      <>
        <YStack gap="2" items="center">
          <Paragraph color="brandCreamMuted">{dictionary.loadingStation}</Paragraph>
        </YStack>
        {backdrop}
        <PlayerDock isWide={isWide} sheet={sheet}>
          <PlayerCard
            stationName={committedChannel.name}
            listeners={listeners}
            status="loading"
            onResume={resume}
            onPause={pause}
            onOpenSheet={() => setSheetOpen(true)}
            sheetOpen={sheetOpen}
          />
        </PlayerDock>
      </>
    );
  }

  return (
    <>
      {backdrop}
      <PlayerDock isWide={isWide} sheet={sheet}>
        <PlayerCard
          stationName={stationName}
          listeners={listeners}
          status={status}
          onResume={resume}
          onPause={pause}
          onOpenSheet={() => setSheetOpen(true)}
          sheetOpen={sheetOpen}
        />
      </PlayerDock>
    </>
  );
}

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
