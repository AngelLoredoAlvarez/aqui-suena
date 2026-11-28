import type { AdsCarouselItem } from "@aqui-suena/api/client";
import { useLocale } from "@aqui-suena/ui/i18n";
import { SearchPill } from "@aqui-suena/ui/player-landing/components/search-pill";
import { BusinessCard } from "@aqui-suena/ui/player-landing/components/sidebar/business-card";
import {
  type Filter,
  FilterChip,
} from "@aqui-suena/ui/player-landing/components/sidebar/filter-chip";
import { useMemo, useState } from "react";
import { Button, isWeb, ScrollView, Text, XStack, YStack } from "tamagui";

const CATEGORY_ORDER = ["food", "health", "retail", "services", "computing", "other"] as const;

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
      <ScrollView
        testID="landing-sidebar-scroll"
        className="hover-reveal-scroll"
        flex={1}
        minH={0}
        showsVerticalScrollIndicator={isWeb}
      >
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
