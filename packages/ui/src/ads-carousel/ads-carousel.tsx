import type { AdsCarouselItem } from "@aqui-suena/api/client";
import { useLocale } from "@aqui-suena/ui/i18n";
import { OptimizedImage } from "@aqui-suena/ui/optimized-image";
import { useCallback, useEffect, useState } from "react";
import { Button, Paragraph, useMedia, YStack } from "tamagui";
import { composeMeta } from "./compose-meta";
import { PaginationDots } from "./pagination-dots";
import { getResponsiveCarouselMaxW, getResponsiveFlyerWidth } from "./responsive";

export type { AdsCarouselItem } from "@aqui-suena/api/client";

export type AdsCarouselProps = {
  readonly items?: readonly AdsCarouselItem[];
  readonly autoAdvanceMs?: number;
};

const DEFAULT_AUTO_ADVANCE_MS = 5000;

// Flyer portrait aspect (3:4) approximates the design's "≈70% of the height"
// card. Exact viewport-height sizing is a landing-composition concern and is
// refined separately.
const FLYER_ASPECT = 4 / 3;

export function AdsCarousel({
  items = [],
  autoAdvanceMs = DEFAULT_AUTO_ADVANCE_MS,
}: AdsCarouselProps) {
  const media = useMedia();
  const { dictionary } = useLocale();
  const maxW = getResponsiveCarouselMaxW(media);
  const flyerWidth = getResponsiveFlyerWidth(media);
  const isWide = flyerWidth !== undefined;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const hasItems = items.length > 0;
  const safeIndex = hasItems ? index % items.length : 0;

  const advance = useCallback(() => {
    if (!hasItems) return;
    setIndex((i) => (i + 1) % items.length);
  }, [hasItems, items.length]);

  useEffect(() => {
    if (!hasItems || paused) return;
    const id = setInterval(advance, autoAdvanceMs);
    return () => clearInterval(id);
  }, [hasItems, paused, autoAdvanceMs, advance]);

  if (!hasItems) {
    return (
      <YStack
        testID="ads-carousel-placeholder"
        width="100%"
        maxW={maxW}
        items="center"
        justify="center"
        gap={12}
        p={24}
        bg="surface"
        borderWidth={1}
        borderColor="borderColor"
        rounded={28}
      >
        <Paragraph text="center" fontWeight="700" fontSize={22}>
          {dictionary.noSponsoredBusinesses}
        </Paragraph>
        <Paragraph text="center" color="muted" fontSize={14}>
          {dictionary.noSponsoredBusinessesHint}
        </Paragraph>
      </YStack>
    );
  }

  const current = items[safeIndex];
  if (!current) {
    return null;
  }
  const flyerW = flyerWidth ?? maxW;
  const flyerH = Math.round(flyerW * FLYER_ASPECT);
  const groupLabel = dictionary.adGroupLabel(safeIndex + 1, items.length);
  const meta = composeMeta(current, {
    isWide,
    deliveryLabel: dictionary.delivery,
  });
  const statusLabel = current.isOpen ? dictionary.open : dictionary.closed;
  const statusColor = current.isOpen ? "ok" : "error";
  const nameFontSize = media.xl ? 26 : isWide ? 24 : 22;

  return (
    <YStack
      testID="ads-carousel"
      width="100%"
      maxW={maxW}
      flexDirection={isWide ? "row" : "column"}
      bg="surface"
      borderWidth={1}
      borderColor="borderColor"
      rounded={28}
      overflow="hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <YStack position="relative" overflow="hidden" shrink={isWide ? 0 : undefined}>
        <OptimizedImage
          src={current.imageUrl}
          alt={current.alt}
          width={flyerW}
          height={flyerH}
          objectFit="cover"
          objectPosition="center top"
          rounded={0}
          priority={safeIndex === 0}
        />
        <YStack
          position="absolute"
          r={12}
          t={12}
          rounded={999}
          py={4}
          px={10}
          bg="surface"
          borderWidth={1}
          borderColor="borderColor"
        >
          <Paragraph fontSize={12} fontWeight="700" color={statusColor}>
            {statusLabel}
          </Paragraph>
        </YStack>
        <PaginationDots count={items.length} activeIndex={safeIndex} label={groupLabel} />
      </YStack>
      <YStack flex={isWide ? 1 : undefined} p={16} gap={6}>
        <Paragraph fontWeight="700" fontSize={nameFontSize}>
          {current.name}
        </Paragraph>
        <Paragraph color="muted" fontSize={14}>
          {meta}
        </Paragraph>
        {!isWide ? (
          <Button
            type="button"
            mt={8}
            rounded={999}
            bg="accent"
            color="onAccent"
            fontWeight="700"
            fontSize={15}
            minH={52}
            px={22}
            self="flex-start"
          >
            {dictionary.viewBusiness}
          </Button>
        ) : null}
      </YStack>
    </YStack>
  );
}
