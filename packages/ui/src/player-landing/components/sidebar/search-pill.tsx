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
      width="100%"
      height={48}
      px={16}
      gap={10}
      items="center"
      justify="flex-start"
      bg="surface2"
      borderWidth={1}
      borderColor="borderColor"
      rounded={999}
    >
      <Icon name="search" size={20} tone="muted" />
      <Text color="muted" fontWeight="600" fontSize={14}>
        {dictionary.searchBusinesses}
      </Text>
    </Button>
  );
}
