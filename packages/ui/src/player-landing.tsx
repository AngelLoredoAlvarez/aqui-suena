import { defaultStationId } from "@aqui-suena/config";
import { usePlayer } from "@aqui-suena/player";
import { useEffect, useState } from "react";
import { H1, Paragraph, YStack } from "tamagui";
import { AdsCarousel } from "./ads-carousel";
import { useExpoAudioDriver } from "./expo-driver";
import { useLocale } from "./i18n/locale-context";
import { LocaleSwitcher } from "./i18n/locale-switcher";
import { useListenerStatus } from "./listener-status";
import { PlayerCard } from "./player-card";

type TestChannel = {
  id: string;
  name: string;
  url: string;
};

const DEFAULT_CHANNEL: TestChannel = {
  id: "test-pop",
  name: "Test Pop",
  url: "/test-streams/test-pop.m4a",
};

const TEST_CHANNELS: readonly TestChannel[] = [
  DEFAULT_CHANNEL,
  { id: "test-jingle", name: "Test Jingle", url: "/test-streams/test-jingle.m4a" },
  { id: "test-night", name: "Test Night", url: "/test-streams/test-night.m4a" },
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
      onSelectStation={onSelectStation}
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
        stationName={listener?.station.name ?? ""}
        listeners={listener?.listeners ?? 0}
        onSelectStation={setSelectedStationId}
      />
      <LocaleSwitcher />
      <AdsCarousel />
    </YStack>
  );
}
