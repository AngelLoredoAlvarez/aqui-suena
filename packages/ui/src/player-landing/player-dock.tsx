import type { ReactNode } from "react";
import { YStack } from "tamagui";

export function PlayerDock({
  isWide,
  sheet,
  children,
}: {
  isWide: boolean;
  sheet: ReactNode;
  children: ReactNode;
}) {
  if (isWide) {
    return (
      <YStack width="100%" mt="auto" position="relative">
        {sheet ? (
          <YStack
            position="absolute"
            b={112}
            l={100}
            r="auto"
            width={320}
            items="stretch"
            z={4}
            pointerEvents="none"
          >
            {sheet}
          </YStack>
        ) : null}
        {children}
      </YStack>
    );
  }

  return (
    <YStack position="absolute" b="5" l={0} r={0} z={2}>
      {sheet ? (
        <YStack position="absolute" b={118} l={0} r={0} z={4} pointerEvents="none">
          {sheet}
        </YStack>
      ) : null}
      {children}
    </YStack>
  );
}
