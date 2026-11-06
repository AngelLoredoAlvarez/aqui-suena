import { Button } from "tamagui";

type SharedButtonProps = {
  title: string;
  onPress?: () => void;
  accessibilityLabel?: string;
};

// Shared button rendered from Tamagui primitives only, so it looks and
// behaves the same on web and native. No raw div or web-only CSS here.
// Uses aria-label (Tamagui v2 no longer maps accessibility* to ARIA on web).
export function SharedButton({ title, onPress, accessibilityLabel }: SharedButtonProps) {
  return (
    <Button onPress={onPress} aria-label={accessibilityLabel ?? title}>
      {title}
    </Button>
  );
}
