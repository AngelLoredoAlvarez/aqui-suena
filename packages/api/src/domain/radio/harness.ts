import type { Station } from "@aqui-suena/api/domain/radio/station";

// Owned dev harness. `activeUrl` is informational: native builds play the same
// files through their own LAN base URL, so the base is environment-specific.
export function harnessStations(streamBaseUrl: string): Station[] {
  return [
    {
      id: "aqui-suena-pop",
      name: "Aquí Suena Pop",
      streamUrl: `${streamBaseUrl}/test-streams/aqui-suena-pop.m4a`,
    },
    {
      id: "aqui-suena-focus",
      name: "Aquí Suena Focus",
      streamUrl: `${streamBaseUrl}/test-streams/aqui-suena-focus.m4a`,
    },
    {
      id: "aqui-suena-night",
      name: "Aquí Suena Night",
      streamUrl: `${streamBaseUrl}/test-streams/aqui-suena-night.m4a`,
    },
  ];
}

export const HARNESS_STATIONS: readonly Station[] = harnessStations("http://localhost:3000");
