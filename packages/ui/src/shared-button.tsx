import { Button } from "tamagui";

type SharedButtonProps = {
  title: string;
  onPress?: () => void;
  accessibilityLabel?: string;
};

// Shared button rendered from Tamagui primitives only, so it looks and
// behaves the same on web and native. No raw div or web-only CSS here.
export function SharedButton({ title, onPress, accessibilityLabel }: SharedButtonProps) {
  return (
    <Button onPress={onPress} accessibilityLabel={accessibilityLabel ?? title}>
      {title}
    </Button>
  );
}
