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
  id: "aqui-suena-pop",
  name: "Aquí Suena Pop",
  urls: channelUrls("aqui-suena-pop.m4a"),
};

export const TEST_CHANNELS: readonly TestChannel[] = [
  DEFAULT_CHANNEL,
  { id: "aqui-suena-focus", name: "Aquí Suena Focus", urls: channelUrls("aqui-suena-focus.m4a") },
  { id: "aqui-suena-night", name: "Aquí Suena Night", urls: channelUrls("aqui-suena-night.m4a") },
];

export const STATIONS = TEST_CHANNELS.map(({ id, name }) => ({ id, name, live: true }));

export function channelById(id: string): TestChannel {
  return TEST_CHANNELS.find((channel) => channel.id === id) ?? DEFAULT_CHANNEL;
}
