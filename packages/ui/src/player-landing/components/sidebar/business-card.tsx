import type { AdsCarouselItem } from "@aqui-suena/api/client";
import { composeMeta } from "@aqui-suena/ui/ads-carousel/utils/compose-meta";
import { useLocale } from "@aqui-suena/ui/i18n";
import { Button, Text, YStack } from "tamagui";

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
  const meta = composeMeta(
    { category: dictionary.category(item.category), delivery: item.delivery },
    { isWide: true, deliveryLabel: dictionary.delivery },
  );

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
      <YStack flex={1} minW={0} gap={2} items="flex-start">
        <Text color="text" fontWeight="700" fontSize={14} numberOfLines={2}>
          {item.name}
        </Text>
        <Text color="muted" fontSize={12} numberOfLines={2}>
          {meta}
        </Text>
      </YStack>
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
      >
        {item.isOpen ? dictionary.open : dictionary.closed}
      </Text>
    </Button>
  );
}
