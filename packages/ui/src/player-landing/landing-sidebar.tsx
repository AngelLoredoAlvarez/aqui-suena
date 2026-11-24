import type { AdsCarouselItem } from "@aqui-suena/api/client";
import { composeMeta } from "@aqui-suena/ui/ads-carousel/compose-meta";
import { useLocale } from "@aqui-suena/ui/i18n";
import { Icon } from "@aqui-suena/ui/shared";
import { useMemo, useState } from "react";
import { Button, ScrollView, Text, XStack, YStack } from "tamagui";

type Filter = "all" | "open" | "delivery" | `category:${string}`;

const CATEGORY_ORDER = ["food", "health", "retail", "services", "computing", "other"] as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function SearchPill({ onPress }: { onPress?: () => void }) {
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

function FilterChip({
  filter,
  label,
  selected,
  onSelect,
}: {
  filter: Filter;
  label: string;
  selected: boolean;
  onSelect: (filter: Filter) => void;
}) {
  return (
    <Button
      testID={`landing-filter-${filter}`}
      type="button"
      aria-pressed={selected}
      onPress={() => onSelect(filter)}
      minH={44}
      px={16}
      rounded={999}
      bg={selected ? "accent" : "surface2"}
      borderWidth={1}
      borderColor={selected ? "accent" : "borderColor"}
    >
      <Text color={selected ? "onAccent" : "text"} fontWeight="600" fontSize={14} numberOfLines={1}>
        {label}
      </Text>
    </Button>
  );
}

function BusinessCard({
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

export function LandingSidebar({
  items,
  width,
  onOpenSearch,
}: {
  items: readonly AdsCarouselItem[];
  width: number;
  onOpenSearch?: () => void;
}) {
  const { dictionary } = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const businesses = useMemo(() => {
    const seen = new Set<string>();

    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);

      return true;
    });
  }, [items]);

  const filters = useMemo(() => {
    const categories = CATEGORY_ORDER.filter((category) =>
      businesses.some((item) => item.category === category),
    );

    return [
      { key: "all" as const, label: dictionary.allFilter },
      ...categories.map((category) => ({
        key: `category:${category}` as Filter,
        label: dictionary.category(category),
      })),
      { key: "open" as const, label: dictionary.openNowFilter },
      { key: "delivery" as const, label: dictionary.deliveryFilter },
    ];
  }, [businesses, dictionary]);

  const visible = businesses.filter((item) => {
    if (filter === "all") return true;
    if (filter === "open") return item.isOpen;
    if (filter === "delivery") return item.delivery;

    return item.category === filter.slice("category:".length);
  });

  const linkSize = width >= 380 ? 12 : 11;

  return (
    <YStack testID="landing-sidebar" width={width} shrink={0} minH={0} gap={10}>
      <SearchPill onPress={onOpenSearch} />
      <XStack flexWrap="wrap" gap={8}>
        {filters.map((entry) => (
          <FilterChip
            key={entry.key}
            filter={entry.key}
            label={entry.label}
            selected={filter === entry.key}
            onSelect={setFilter}
          />
        ))}
      </XStack>
      <Text color="text" fontWeight="700" fontSize={18}>
        {dictionary.businesses}
      </Text>
      <ScrollView flex={1} minH={0} showsVerticalScrollIndicator={false}>
        <YStack gap={10} pr={2}>
          {visible.map((item, index) => (
            <BusinessCard key={item.id} item={item} selected={index === 0} />
          ))}
        </YStack>
      </ScrollView>
      <XStack flexWrap="wrap" gap={10} mt="auto" pt={6}>
        {[dictionary.privacyNotice, dictionary.termsAndConditions, dictionary.reportContent].map(
          (label) => (
            <Button
              key={label}
              type="button"
              bg="transparent"
              borderWidth={0}
              p={0}
              minH={24}
              onPress={() => {}}
            >
              <Text
                color="muted"
                fontSize={linkSize}
                fontWeight="600"
                textDecorationLine="underline"
              >
                {label}
              </Text>
            </Button>
          ),
        )}
      </XStack>
    </YStack>
  );
}
