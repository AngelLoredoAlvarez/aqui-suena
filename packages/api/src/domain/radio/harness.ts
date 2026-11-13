import type { Station } from "@aqui-suena/api/domain/radio/station";

// Owned dev harness. `activeUrl` is informational: native builds play the same
// files through their own LAN base URL, so the base is environment-specific.
export function harnessStations(streamBaseUrl: string): Station[] {
  return [
    {
      id: "test-pop",
      name: "Test Pop",
      streamUrl: `${streamBaseUrl}/test-streams/test-pop.m4a`,
    },
    {
      id: "test-jingle",
      name: "Test Jingle",
      streamUrl: `${streamBaseUrl}/test-streams/test-jingle.m4a`,
    },
    {
      id: "test-night",
      name: "Test Night",
      streamUrl: `${streamBaseUrl}/test-streams/test-night.m4a`,
    },
  ];
}

export const HARNESS_STATIONS: readonly Station[] = harnessStations("http://localhost:3000");
