import { defaultStationId } from "@aqui-suena/config";
import { usePlayer } from "@aqui-suena/player";
import { AdsCarousel } from "@aqui-suena/ui/ads-carousel";
import { streamBaseUrl, useExpoAudioDriver } from "@aqui-suena/ui/drivers";
import { LocaleSwitcher, useLocale } from "@aqui-suena/ui/i18n";
import { PlayerCard } from "@aqui-suena/ui/player-card";
import { useEffect, useState } from "react";
import { H1, Paragraph, YStack } from "tamagui";
import { useListenerStatus } from "./listener-status";

type TestChannel = {
  id: string;
  name: string;
  url: string;
};

const DEFAULT_CHANNEL: TestChannel = {
  id: "test-pop",
  name: "Test Pop",
  url: `${streamBaseUrl}/test-streams/test-pop.m4a`,
};

const TEST_CHANNELS: readonly TestChannel[] = [
  DEFAULT_CHANNEL,
  { id: "test-jingle", name: "Test Jingle", url: `${streamBaseUrl}/test-streams/test-jingle.m4a` },
  { id: "test-night", name: "Test Night", url: `${streamBaseUrl}/test-streams/test-night.m4a` },
];

function channelById(id: string): TestChannel {
  return TEST_CHANNELS.find((channel) => channel.id === id) ?? DEFAULT_CHANNEL;
}

function StationPlayer({
  channel,
  stationName,
  listeners,
  onSelectStation,
}: {
  channel: TestChannel;
  stationName: string;
  listeners: number;
  onSelectStation: (stationId: string) => void;
}) {
  const driver = useExpoAudioDriver();
  const { status, pause, resume } = usePlayer({ urls: [channel.url], driver });
  const { dictionary } = useLocale();

  const handleSelectStation = (stationId: string): void => {
    driver.pause();
    onSelectStation(stationId);
  };

  if (status === "idle" || status === "loading") {
    return <Paragraph color="$brandCreamMuted">{dictionary.loadingStation}</Paragraph>;
  }

  return (
    <PlayerCard
      stationName={stationName}
      listeners={listeners}
      status={status}
      onResume={resume}
      onPause={pause}
      stations={TEST_CHANNELS.map(({ id, name }) => ({ id, name }))}
      onSelectStation={handleSelectStation}
    />
  );
}

export function PlayerLanding() {
  const [mounted, setMounted] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState("test-pop");

  const { data: listener } = useListenerStatus(defaultStationId);
  const { dictionary } = useLocale();
  const channel = channelById(selectedStationId);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !listener) {
    return (
      <YStack flex={1} width="100%" items="center" justify="center" gap="$5" p="$5" bg="$brand1">
        <H1 color="$brandCream">{dictionary.appTitle}</H1>
        <Paragraph color="$brandCreamMuted">{dictionary.loadingStation}</Paragraph>
        <LocaleSwitcher />
        <AdsCarousel />
      </YStack>
    );
  }

  return (
    <YStack flex={1} width="100%" items="center" justify="center" gap="$5" p="$5" bg="$brand1">
      <H1 color="$brandCream">{dictionary.appTitle}</H1>
      <StationPlayer
        key={channel.id}
        channel={channel}
        stationName={channel.name}
        listeners={listener?.listeners ?? 0}
        onSelectStation={setSelectedStationId}
      />
      <LocaleSwitcher />
      <AdsCarousel />
    </YStack>
  );
}
