import type { PlayerInsets } from "@aqui-suena/ui/player-landing/player-spacing";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// The context reports native safe-area insets; it never applies them on its own.
export function usePlayerInsets(): PlayerInsets {
  const insets = useSafeAreaInsets();

  return { top: insets.top, bottom: insets.bottom };
}
