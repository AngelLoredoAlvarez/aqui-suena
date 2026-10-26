import { OptimizedImage } from "@aqui-suena/ui/optimized-image";
import { useCallback, useEffect, useState } from "react";
import { H2, Paragraph, useMedia, YStack } from "tamagui";

import { getResponsiveCarouselMaxW } from "./responsive";

export type AdsCarouselItem = {
  readonly id: string;
  readonly imageUrl: string;
  readonly alt: string;
  readonly href?: string;
};

export type AdsCarouselProps = {
  readonly items?: readonly AdsCarouselItem[];
  readonly autoAdvanceMs?: number;
};

const DEFAULT_AUTO_ADVANCE_MS = 5000;

export function AdsCarousel({
  items = [],
  autoAdvanceMs = DEFAULT_AUTO_ADVANCE_MS,
}: AdsCarouselProps) {
  const media = useMedia();
  const maxW = getResponsiveCarouselMaxW(media);

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
        items="center"
        justify="center"
        gap="2"
        p="4"
        width="100%"
        maxW={maxW}
        aria-label="Advertisements"
        testID="ads-carousel-placeholder"
      >
        <H2>Ads</H2>
        <Paragraph>Ad carousel placeholder. Real ads land with the ads-display module.</Paragraph>
      </YStack>
    );
  }

  const current = items[safeIndex]!;

  return (
    <YStack
      testID="ads-carousel"
      items="center"
      justify="center"
      gap="2"
      p="4"
      width="100%"
      maxW={maxW}
      aria-label="Advertisements"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <OptimizedImage
        src={current.imageUrl}
        alt={current.alt}
        width={maxW}
        height={Math.round((maxW * 9) / 16)}
        priority={safeIndex === 0}
      />
      {current.href ? (
        <a href={current.href} style={{ textDecoration: "none" }}>
          <Paragraph>{current.alt}</Paragraph>
        </a>
      ) : (
        <Paragraph>{current.alt}</Paragraph>
      )}
    </YStack>
  );
}
