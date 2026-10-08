"use client";

import { PlayerLanding } from "@aqui-suena/ui";

// Landing is the player plus the ads carousel. Stays `use client` since it
// consumes Tamagui. There is no separate player route.
export default function HomePage() {
  return <PlayerLanding />;
}
