import { defaultStationId } from "@aqui-suena/config";
import { usePlayer } from "@aqui-suena/player";
import { AdsCarousel } from "@aqui-suena/ui/ads-carousel";
import { streamBaseUrl, useExpoAudioDriver } from "@aqui-suena/ui/drivers";
import { LocaleSwitcher, useLocale } from "@aqui-suena/ui/i18n";
import { PlayerCard } from "@aqui-suena/ui/player-card";
import { useEffect, useState } from "react";
import { Button, H1, Paragraph, XStack, YStack } from "tamagui";
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
  const [committedChannel, setCommittedChannel] = useState(channel);

  const driver = useExpoAudioDriver();
  const { status, activeUrl, pause, resume } = usePlayer({ urls: [channel.url], driver });
  const { dictionary } = useLocale();

  const handleSelectStation = (stationId: string): void => {
    onSelectStation(stationId);
  };

  useEffect(() => {
    if (status === "playing" && activeUrl === channel.url) {
      setCommittedChannel(channel);
    }
  }, [status, channel, activeUrl]);

  const switching =
    activeUrl !== null &&
    channel.id !== committedChannel.id &&
    (status === "playing" || status === "loading" || status === "idle");

  if (status === "idle" || status === "loading" || switching) {
    if (switching) {
      return (
        <PlayerCard
          stationName={committedChannel.name}
          listeners={listeners}
          status="playing"
          onResume={resume}
          onPause={pause}
          stations={TEST_CHANNELS.map(({ id, name }) => ({ id, name }))}
          onSelectStation={handleSelectStation}
          connectingStationId={channel.id}
        />
      );
    }

    return (
      <YStack gap="$2" items="center">
        <Paragraph color="$brandCreamMuted">{dictionary.loadingStation}</Paragraph>
        <XStack gap="$2" flexWrap="wrap" testID="station-selector">
          {TEST_CHANNELS.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="$2"
              rounded={999}
              bg="$brand3"
              borderColor="$brand5"
              borderWidth={1}
              color="$brandCream"
              hoverStyle={{ bg: "$brand4" }}
              pressStyle={{ bg: "$brand5" }}
              focusStyle={{ bg: "$brand4" }}
              disabled={item.id === channel.id}
              onPress={() => handleSelectStation(item.id)}
            >
              {item.name}
            </Button>
          ))}
        </XStack>
      </YStack>
    );
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
