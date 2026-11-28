import type { AdsCarouselItem } from "@aqui-suena/api/client";
import { useLocale } from "@aqui-suena/ui/i18n";
import { Button, Text, XStack, YStack } from "tamagui";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function BusinessCard({
  item,
  selected,
  onPress,
}: {
  item: AdsCarouselItem;
  selected: boolean;
  onPress?: () => void;
}) {
  const { dictionary } = useLocale();

  return (
    <Button
      testID={`business-card-${item.id}`}
      type="button"
      onPress={onPress}
      width="100%"
      p={10}
      gap={10}
      items="center"
      justify="flex-start"
      bg="surface"
      borderWidth={selected ? 2 : 1}
      borderColor={selected ? "accent" : "borderColor"}
      rounded={20}
    >
      <YStack width={48} height={48} rounded={14} bg="surface2" items="center" justify="center">
        <Text color="text" fontWeight="700" fontSize={16}>
          {initials(item.name)}
        </Text>
      </YStack>
      <XStack flex={1} minW={0} items="center" gap={8}>
        <Text color="text" fontWeight="700" fontSize={14} numberOfLines={1} flex={1}>
          {item.name}
        </Text>
        <Text
          color={item.isOpen ? "ok" : "error"}
          fontSize={11}
          fontWeight="700"
          bg="surface"
          borderWidth={1}
          borderColor="borderColor"
          rounded={999}
          px={8}
          py={4}
          shrink={0}
        >
          {item.isOpen ? dictionary.open : dictionary.closed}
        </Text>
      </XStack>
    </Button>
  );
}
