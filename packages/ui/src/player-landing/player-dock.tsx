import type { PlayerCardPosition } from "@aqui-suena/ui/state";
import type { ReactNode } from "react";
import { YStack } from "tamagui";

export function PlayerDock({
  isWide,
  position = "bottom",
  sheet,
  children,
}: {
  isWide: boolean;
  position?: PlayerCardPosition;
  sheet: ReactNode;
  children: ReactNode;
}) {
  const sheetPlacement = position === "top" ? "below" : "above";
  const dockMarginTop = position === "bottom" ? "auto" : undefined;
  const sheetAnchor = position === "top" ? { t: isWide ? 112 : 118 } : { b: isWide ? 112 : 118 };

  if (isWide) {
    return (
      <YStack width="100%" mt={dockMarginTop} position="relative">
        {sheet ? (
          <YStack
            testID="player-dock-sheet"
            data-sheet-placement={sheetPlacement}
            position="absolute"
            {...sheetAnchor}
            l={100}
            r="auto"
            width={320}
            items="stretch"
            z={4}
            pointerEvents="box-none"
          >
            {sheet}
          </YStack>
        ) : null}
        {children}
      </YStack>
    );
  }

  return (
    <YStack width="100%" mt={dockMarginTop} position="relative" z={2}>
      {sheet ? (
        <YStack
          testID="player-dock-sheet"
          data-sheet-placement={sheetPlacement}
          position="absolute"
          {...sheetAnchor}
          l={0}
          r={0}
          z={4}
          pointerEvents="box-none"
        >
          {sheet}
        </YStack>
      ) : null}
      {children}
    </YStack>
  );
}
