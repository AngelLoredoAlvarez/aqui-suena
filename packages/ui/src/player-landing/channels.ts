import { streamBaseUrl } from "@aqui-suena/ui/drivers";

export type TestChannel = {
  id: string;
  name: string;
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

export const TEST_CHANNELS: readonly TestChannel[] = [
  DEFAULT_CHANNEL,
  { id: "test-jingle", name: "Test Jingle", urls: channelUrls("test-jingle.m4a") },
  { id: "test-night", name: "Test Night", urls: channelUrls("test-night.m4a") },
];

export const STATIONS = TEST_CHANNELS.map(({ id, name }) => ({ id, name, live: true }));

export function channelById(id: string): TestChannel {
  return TEST_CHANNELS.find((channel) => channel.id === id) ?? DEFAULT_CHANNEL;
}
