import { Button, XStack, YStack } from "tamagui";

export type PositionToggleProps = {
  label: string;
  onToggle: () => void;
};

export function PositionToggle({ label, onToggle }: PositionToggleProps) {
  return (
    <Button
      type="button"
      aria-label={label}
      onPress={onToggle}
      width={44}
      height={44}
      rounded={22}
      borderWidth={0}
      bg="surface2"
      p={0}
      display="flex"
      items="center"
      justify="center"
    >
      <XStack items="center" justify="center" gap={4}>
        {/* up arrow */}
        <YStack items="center" gap={0}>
          <YStack
            width={0}
            height={0}
            borderLeftWidth={3}
            borderRightWidth={3}
            borderBottomWidth={5}
            borderLeftColor="transparent"
            borderRightColor="transparent"
            borderBottomColor="color"
          />
          <YStack width={2} height={6} bg="color" />
        </YStack>
        {/* down arrow */}
        <YStack items="center" gap={0}>
          <YStack width={2} height={6} bg="color" />
          <YStack
            width={0}
            height={0}
            borderLeftWidth={3}
            borderRightWidth={3}
            borderTopWidth={5}
            borderLeftColor="transparent"
            borderRightColor="transparent"
            borderTopColor="color"
          />
        </YStack>
      </XStack>
    </Button>
  );
}
