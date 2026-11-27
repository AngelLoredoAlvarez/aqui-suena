import { useLocale } from "@aqui-suena/ui/i18n";
import { Icon } from "@aqui-suena/ui/shared";
import { Button, Text } from "tamagui";

export type SearchPillSize = "sm" | "md";

export function SearchPill({
  onPress,
  size = "md",
}: {
  onPress?: () => void;
  size?: SearchPillSize;
}) {
  const { dictionary } = useLocale();
  const compact = size === "sm";

  return (
    <Button
      testID="landing-search"
      type="button"
      aria-label={dictionary.searchBusinessesAria}
      onPress={onPress}
      flex={compact ? 1 : undefined}
      minW={compact ? 0 : undefined}
      width={compact ? undefined : "100%"}
      height={compact ? 44 : 48}
      px={compact ? 12 : 16}
      gap={compact ? 8 : 10}
      items="center"
      justify="flex-start"
      bg="surface2"
      borderWidth={1}
      borderColor="borderColor"
      rounded={999}
    >
      <Icon name="search" size={compact ? 18 : 20} tone="muted" />
      <Text
        color="muted"
        fontWeight="600"
        fontSize={14}
        numberOfLines={compact ? 1 : undefined}
        overflow={compact ? "hidden" : undefined}
        textOverflow={compact ? "ellipsis" : undefined}
      >
        {dictionary.searchBusinesses}
      </Text>
    </Button>
  );
}
