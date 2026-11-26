import { useLocale } from "@aqui-suena/ui/i18n";
import { Icon } from "@aqui-suena/ui/shared";
import { Button, Text } from "tamagui";

export function SearchPill({ onPress }: { onPress?: () => void }) {
  const { dictionary } = useLocale();

  return (
    <Button
      testID="landing-search"
      type="button"
      aria-label={dictionary.searchBusinessesAria}
      onPress={onPress}
      flex={1}
      minW={0}
      height={44}
      px={12}
      gap={8}
      items="center"
      justify="flex-start"
      bg="surface2"
      borderWidth={1}
      borderColor="borderColor"
      rounded={999}
    >
      <Icon name="search" size={18} tone="muted" />
      <Text
        color="muted"
        fontWeight="600"
        fontSize={14}
        numberOfLines={1}
        overflow="hidden"
        textOverflow="ellipsis"
      >
        {dictionary.searchBusinesses}
      </Text>
    </Button>
  );
}
