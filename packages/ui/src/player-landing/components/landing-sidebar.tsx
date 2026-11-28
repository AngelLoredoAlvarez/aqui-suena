import type { AdsCarouselItem } from "@aqui-suena/api/client";
import { useLocale } from "@aqui-suena/ui/i18n";
import { SearchPill } from "@aqui-suena/ui/player-landing/components/search-pill";
import { BusinessCard } from "@aqui-suena/ui/player-landing/components/sidebar/business-card";
import {
  type Filter,
  FilterChip,
} from "@aqui-suena/ui/player-landing/components/sidebar/filter-chip";
import { ScrollbarThumb } from "@aqui-suena/ui/shared/scrollbar/scrollbar-thumb";
import { useHoverScrollbar } from "@aqui-suena/ui/shared/scrollbar/use-hover-scrollbar";
import { useMemo, useRef, useState } from "react";
import {
  Button,
  type GetRef,
  isWeb,
  ScrollView,
  type TamaguiElement,
  Text,
  XStack,
  YStack,
} from "tamagui";

const CATEGORY_ORDER = ["food", "health", "retail", "services", "computing", "other"] as const;

type ScrollViewElement = GetRef<typeof ScrollView>;

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
  const filtersScrollRef = useRef<ScrollViewElement>(null);
  const filtersHoverRef = useRef<TamaguiElement>(null);
  const listScrollRef = useRef<ScrollViewElement>(null);
  const listHoverRef = useRef<TamaguiElement>(null);
  const filtersScrollbar = useHoverScrollbar({
    scrollRef: filtersScrollRef,
    hoverRef: filtersHoverRef,
    orientation: "horizontal",
  });
  const listScrollbar = useHoverScrollbar({
    scrollRef: listScrollRef,
    hoverRef: listHoverRef,
    orientation: "vertical",
  });

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
      <YStack
        ref={filtersHoverRef}
        testID="landing-sidebar-filters-scroll-area"
        position="relative"
        width="100%"
        style={isWeb ? { paddingBottom: 8 } : undefined}
      >
        <ScrollView
          ref={filtersScrollRef}
          testID="landing-sidebar-filters-scroll"
          className="hide-native-scrollbar"
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
          width="100%"
        >
          <XStack gap={8} pr={2} shrink={0}>
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
        </ScrollView>
        <ScrollbarThumb
          testID="landing-sidebar-filters-scroll-thumb"
          orientation="horizontal"
          geometry={filtersScrollbar.geometry}
          visible={filtersScrollbar.visible}
          dragging={filtersScrollbar.dragging}
          thumbRef={filtersScrollbar.thumbRef}
        />
      </YStack>
      <Text color="text" fontWeight="700" fontSize={18}>
        {dictionary.businesses}
      </Text>
      <YStack
        ref={listHoverRef}
        testID="landing-sidebar-scroll-area"
        position="relative"
        flex={1}
        minH={0}
        style={isWeb ? { paddingRight: 8 } : undefined}
      >
        <ScrollView
          ref={listScrollRef}
          testID="landing-sidebar-scroll"
          className="hide-native-scrollbar"
          flex={1}
          minH={0}
          showsVerticalScrollIndicator={false}
        >
          <YStack gap={10} pr={2}>
            {visible.map((item, index) => (
              <BusinessCard key={item.id} item={item} selected={index === 0} />
            ))}
          </YStack>
        </ScrollView>
        <ScrollbarThumb
          testID="landing-sidebar-scroll-thumb"
          orientation="vertical"
          geometry={listScrollbar.geometry}
          visible={listScrollbar.visible}
          dragging={listScrollbar.dragging}
          thumbRef={listScrollbar.thumbRef}
        />
      </YStack>
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
