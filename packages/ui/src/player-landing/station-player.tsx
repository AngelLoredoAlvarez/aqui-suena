import { type TrayBridge, type TrayLabels, usePlayer, useTraySync } from "@aqui-suena/player";
import { useExpoAudioDriver } from "@aqui-suena/ui/drivers";
import { useLocale } from "@aqui-suena/ui/i18n";
import { PlayerCard } from "@aqui-suena/ui/player-card";
import type { PlayerCardPosition } from "@aqui-suena/ui/state";
import { playerCardPositionAtom } from "@aqui-suena/ui/state";
import {
  StationSheetBackdrop,
  StationSheetCard,
  useEscapeToClose,
} from "@aqui-suena/ui/station-sheet";
import { useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Paragraph, useMedia, YStack } from "tamagui";
import { STATIONS, type TestChannel } from "./channels";
import { PlayerDock } from "./player-dock";

export function StationPlayer({
  channel,
  stationName,
  listeners,
  onSelectStation,
  trayBridge,
  onPositionChange,
}: {
  channel: TestChannel;
  stationName: string;
  listeners: number;
  onSelectStation: (stationId: string) => void;
  trayBridge: TrayBridge;
  onPositionChange?: (position: PlayerCardPosition) => void;
}) {
  const [committedChannel, setCommittedChannel] = useState(channel);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [position, setPosition] = useAtom(playerCardPositionAtom);

  const driver = useExpoAudioDriver();
  const { dictionary } = useLocale();
  const media = useMedia();
  const isWide = media.md;
  const { status, activeUrl, pause, resume } = usePlayer({
    urls: channel.urls,
    driver,
    nowPlaying: { title: channel.name, artist: dictionary.appTitle },
  });

  const closeSheet = (): void => {
    setSheetOpen(false);
  };

  const handleTogglePlayback = useCallback((): void => {
    if (status === "playing") {
      pause();
    } else {
      resume();
    }
  }, [status, pause, resume]);

  const handleTogglePosition = useCallback((): void => {
    const next: PlayerCardPosition = position === "top" ? "bottom" : "top";
    setPosition(next);
    onPositionChange?.(next);
  }, [position, setPosition, onPositionChange]);

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
    onSelectStation,
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
      onSelectStation={onSelectStation}
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

  // While a station switch is in flight, keep showing the committed channel
  // card with a "playing" status so the UI never flickers to the loading
  // state for the new channel.
  const isSwitching =
    activeUrl !== null &&
    channel.id !== committedChannel.id &&
    (status === "playing" || status === "loading" || status === "idle");

  const isLoading = status === "loading" && !isSwitching;

  const displayName = isSwitching || isLoading ? committedChannel.name : stationName;
  const displayStatus = isSwitching ? "playing" : status;

  return (
    <>
      {isLoading && (
        <YStack gap="2" items="center">
          <Paragraph color="brandCreamMuted">{dictionary.loadingStation}</Paragraph>
        </YStack>
      )}
      {backdrop}
      <PlayerDock isWide={isWide} sheet={sheet}>
        <PlayerCard
          stationName={displayName}
          listeners={listeners}
          status={displayStatus}
          onResume={resume}
          onPause={pause}
          onOpenSheet={() => setSheetOpen(true)}
          sheetOpen={sheetOpen}
          onTogglePosition={handleTogglePosition}
        />
      </PlayerDock>
    </>
  );
}
