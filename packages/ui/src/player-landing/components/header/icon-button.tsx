import { Icon } from "@aqui-suena/ui/shared";
import { Button } from "tamagui";

export function IconButton({
  testID,
  label,
  icon,
  onPress,
}: {
  testID: string;
  label: string;
  icon: "menu" | "sun";
  onPress?: () => void;
}) {
  return (
    <Button
      testID={testID}
      type="button"
      aria-label={label}
      onPress={onPress}
      width={44}
      height={44}
      rounded={22}
      p={0}
      bg="surface2"
      items="center"
      justify="center"
    >
      <Icon name={icon} size={22} tone="text" />
    </Button>
  );
}
