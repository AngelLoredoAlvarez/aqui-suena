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
import {
  StationSheetBackdrop,
  StationSheetCard,
  useEscapeToClose,
} from "@aqui-suena/ui/station-sheet";
import { useCallback, useEffect, useMemo, useState } from "react";
import { H1, isWeb, Paragraph, Theme, YStack } from "tamagui";
import { useListenerStatus } from "./listener-status";

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

const STATIONS = TEST_CHANNELS.map(({ id, name }) => ({ id, name, live: true }));

function channelById(id: string): TestChannel {
  return TEST_CHANNELS.find((channel) => channel.id === id) ?? DEFAULT_CHANNEL;
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
  const { status, activeUrl, pause, resume } = usePlayer({
    urls: channel.urls,
    driver,
    nowPlaying: { title: channel.name, artist: dictionary.appTitle },
  });

  // Backdrop lives at column level for full coverage while the card stays
  // in the bottom-anchored wrapper above the dock; one backdrop+card pair
  // shared by every loaded branch so a tap during switching opens
  // immediately instead of popping up later.
  // Catalog liveness lands with real permissions; every dev channel plays today.
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
      pause: dictionary.pause,
      stations: dictionary.trayStations,
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

  const sheetBackdrop = <StationSheetBackdrop onClose={closeSheet} />;

  const sheetCard = (
    <StationSheetCard
      stations={STATIONS}
      activeStationId={channel.id}
      onSelectStation={handleSelectStation}
      onClose={closeSheet}
    />
  );

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
          {sheetOpen ? sheetBackdrop : null}
          <YStack position="absolute" b="5" l={0} r={0} z={2}>
            {sheetOpen ? sheetCard : null}
            <PlayerCard
              stationName={committedChannel.name}
              listeners={listeners}
              status="playing"
              onResume={resume}
              onPause={pause}
              onOpenSheet={() => setSheetOpen(true)}
            />
          </YStack>
        </>
      );
    }

    return (
      <>
        <YStack gap="2" items="center">
          <Paragraph color="brandCreamMuted">{dictionary.loadingStation}</Paragraph>
        </YStack>
        {sheetOpen ? sheetBackdrop : null}
        <YStack position="absolute" b="5" l={0} r={0} z={2}>
          {sheetOpen ? sheetCard : null}
          <PlayerCard
            stationName={committedChannel.name}
            listeners={listeners}
            status="loading"
            onResume={resume}
            onPause={pause}
            onOpenSheet={() => setSheetOpen(true)}
          />
        </YStack>
      </>
    );
  }

  return (
    <>
      {sheetOpen ? sheetBackdrop : null}
      <YStack position="absolute" b="5" l={0} r={0} z={2}>
        {sheetOpen ? sheetCard : null}
        <PlayerCard
          stationName={stationName}
          listeners={listeners}
          status={status}
          onResume={resume}
          onPause={pause}
          onOpenSheet={() => setSheetOpen(true)}
        />
      </YStack>
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
  const [selectedStationId, setSelectedStationId] = useState("test-pop");

  const { data: listener } = useListenerStatus(defaultStationId);
  const { dictionary } = useLocale();
  const channel = channelById(selectedStationId);

  useEffect(() => {
    setMounted(true);
  }, []);

  const player = (
    <StationPlayer
      channel={channel}
      stationName={channel.name}
      listeners={listener?.listeners ?? 0}
      onSelectStation={setSelectedStationId}
      trayBridge={trayBridge}
    />
  );

  if (!mounted || !listener) {
    return (
      <YStack flex={1} width="100%" items="center" justify="center" gap="5" p="5" bg="bg">
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
        maxW={390}
        minH={isWeb ? "100vh" : undefined}
        position="relative"
        mx={"auto"}
        items="center"
        justify="center"
        gap="5"
        p="5"
        bg="bg"
      >
        <H1 color="brandCream">{dictionary.appTitle}</H1>
        <LocaleSwitcher />
        {scheme === "brasa" ? player : null}
        <YStack testID="landing-content" width="100%" items="center">
          <AdsCarousel />
        </YStack>
        {scheme === "brasa" ? null : player}
      </YStack>
    </Theme>
  );
}
