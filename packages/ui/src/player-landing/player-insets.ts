import type { PlayerInsets } from "@aqui-suena/ui/player-landing/player-spacing";

// Web and desktop keep the approved spacing: no native system bars.
export function usePlayerInsets(): PlayerInsets {
  return { top: 0, bottom: 0 };
}
