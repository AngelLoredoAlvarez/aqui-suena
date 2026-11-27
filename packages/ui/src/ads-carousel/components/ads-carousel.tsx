import type { AdsCarouselItem } from "@aqui-suena/api/client";
import {
  ContactActions,
  ContactRow,
  FlyerNavButton,
  FlyerTransition,
} from "@aqui-suena/ui/ads-carousel/components/carousel-parts";
import { useCarouselDrag } from "@aqui-suena/ui/ads-carousel/hooks/use-carousel-drag";
import { composeMeta } from "@aqui-suena/ui/ads-carousel/utils/compose-meta";
import { formatSchedule } from "@aqui-suena/ui/ads-carousel/utils/format-schedule";
import {
  getResponsiveCarouselMaxW,
  getResponsiveFlyerWidth,
} from "@aqui-suena/ui/ads-carousel/utils/responsive";
import { FlyerLightbox } from "@aqui-suena/ui/flyer-lightbox/flyer-lightbox";
import { useLocale } from "@aqui-suena/ui/i18n";
import { OptimizedImage } from "@aqui-suena/ui/optimized-image";
import { useImagePrefetch } from "@aqui-suena/ui/optimized-image/use-image-prefetch";
import { Icon } from "@aqui-suena/ui/shared";
import { useCallback, useEffect, useState } from "react";
import { Button, Paragraph, ScrollView, Text, useMedia, XStack, YStack } from "tamagui";

export type { AdsCarouselItem } from "@aqui-suena/api/client";

export type AdsCarouselProps = {
  readonly items?: readonly AdsCarouselItem[];
  readonly autoAdvanceMs?: number;
};

const DEFAULT_AUTO_ADVANCE_MS = 5000;

function AdsCarouselPlaceholder({ maxW }: { maxW: number | undefined }) {
  const { dictionary } = useLocale();

  return (
    <YStack
      testID="ads-carousel-placeholder"
      aria-label={dictionary.advertisements}
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

function AdsCarouselDetails({
  item,
  isWide,
  nameFontSize,
  meta,
  schedule,
}: {
  item: AdsCarouselItem;
  isWide: boolean;
  nameFontSize: number;
  meta: string;
  schedule: string;
}) {
  const { dictionary } = useLocale();
  const showsBusinessCta = item.plan === "trades" || item.plan === "commerce";

  return (
    <YStack
      flex={isWide ? 1 : undefined}
      minH={isWide ? 0 : undefined}
      p={isWide ? 24 : 16}
      gap={6}
    >
      <Paragraph fontWeight="700" fontSize={nameFontSize}>
        {item.name}
      </Paragraph>
      <Paragraph color="muted" fontSize={14}>
        {meta}
      </Paragraph>
      {isWide ? (
        <>
          <ScrollView
            testID="ads-carousel-details-scroll"
            className="ads-details-scroll"
            style={{ flexGrow: 0, flexShrink: 1 }}
            minH={0}
            width="100%"
            mt={8}
          >
            <YStack width="100%">
              {item.phone ? <ContactRow label={dictionary.phone} value={item.phone} /> : null}
              {item.phone ? <ContactRow label={dictionary.whatsapp} value={item.phone} /> : null}
              {item.address ? <ContactRow label={dictionary.address} value={item.address} /> : null}
              {schedule ? <ContactRow label={dictionary.schedule} value={schedule} /> : null}
            </YStack>
          </ScrollView>
          {showsBusinessCta ? (
            <Button
              type="button"
              mt={8}
              rounded={999}
              bg="surface2"
              minH={48}
              px={18}
              gap={8}
              items="center"
              self="flex-start"
              shrink={0}
            >
              <Text color="text" fontWeight="700" fontSize={14}>
                {dictionary.viewBusiness}
              </Text>
              <Icon name="arrow-right" size={18} tone="text" />
            </Button>
          ) : null}
          <ContactActions />
        </>
      ) : (
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
          gap={8}
          items="center"
          self="flex-start"
        >
          <Text color="onAccent" fontWeight="700" fontSize={15}>
            {dictionary.viewBusiness}
          </Text>
          <Icon name="arrow-right" size={18} tone="onAccent" />
        </Button>
      )}
    </YStack>
  );
}

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
  const [hovered, setHovered] = useState(false);
  const [openFlyer, setOpenFlyer] = useState<AdsCarouselItem | null>(null);

  const hasItems = items.length > 0;
  const safeIndex = hasItems ? index % items.length : 0;

  const advance = useCallback(() => {
    if (!hasItems) return;
    setIndex((i) => (i + 1) % items.length);
  }, [hasItems, items.length]);

  const goTo = useCallback(
    (next: number) => {
      if (!hasItems) return;
      setIndex(((next % items.length) + items.length) % items.length);
    },
    [hasItems, items.length],
  );

  const goPrevious = (): void => goTo(safeIndex - 1);
  const goNext = (): void => goTo(safeIndex + 1);

  const {
    dragging,
    swiped,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handlePointerLeave,
  } = useCarouselDrag({ previous: goPrevious, next: goNext });

  const isPaused = hovered || dragging || openFlyer !== null;

  useEffect(() => {
    if (!hasItems || isPaused) return;
    const id = setInterval(advance, autoAdvanceMs);
    return () => clearInterval(id);
  }, [hasItems, isPaused, autoAdvanceMs, advance, safeIndex]);

  const nearbyImageUrls = hasItems
    ? [
        ...new Set([
          items[(safeIndex + 1) % items.length]?.imageUrl,
          items[(safeIndex - 1 + items.length) % items.length]?.imageUrl,
        ]),
      ].filter((url): url is string => url !== undefined)
    : [];

  useImagePrefetch(nearbyImageUrls);

  if (!hasItems) {
    return <AdsCarouselPlaceholder maxW={maxW} />;
  }

  const current = items[safeIndex];
  if (!current) {
    return null;
  }

  const flyerW = flyerWidth ?? maxW;

  const groupLabel = dictionary.adGroupLabel(safeIndex + 1, items.length);

  const meta = composeMeta(
    {
      category: dictionary.category(current.category),
      delivery: current.delivery,
      opensLabel: current.opensAt ? dictionary.opensAt(current.opensAt) : undefined,
    },
    {
      isWide,
      deliveryLabel: dictionary.delivery,
    },
  );

  const statusLabel = current.isOpen ? dictionary.open : dictionary.closed;

  const statusColor = current.isOpen ? "ok" : "error";

  const schedule = current.hours ? formatSchedule(current.hours, dictionary.weekdays) : "";

  let nameFontSize = 22;

  if (media.xl) {
    nameFontSize = 26;
  } else if (isWide) {
    nameFontSize = 24;
  }

  return (
    <YStack
      testID="ads-carousel"
      aria-label={dictionary.advertisements}
      width="100%"
      maxW={maxW}
      flex={1}
      flexDirection={isWide ? "row" : "column"}
      bg="surface"
      borderWidth={1}
      borderColor="borderColor"
      rounded={28}
      overflow="hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setHovered(false)}
      onTouchCancel={() => setHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
    >
      <YStack
        testID="ads-carousel-flyer"
        role="group"
        aria-label={groupLabel}
        position="relative"
        overflow="hidden"
        width={isWide ? flyerW : undefined}
        shrink={isWide ? 0 : undefined}
        flex={isWide ? undefined : 1}
      >
        <FlyerTransition key={current.id}>
          <OptimizedImage
            src={current.imageUrl}
            alt={current.alt}
            fill
            objectFit="contain"
            rounded={0}
            priority
            draggable={false}
          />
        </FlyerTransition>
        <Button
          testID="ads-carousel-open-flyer"
          type="button"
          aria-label={dictionary.openFlyer}
          onPress={() => {
            if (swiped.current) {
              return;
            }

            setOpenFlyer(current);
          }}
          position="absolute"
          t={0}
          l={0}
          r={0}
          b={0}
          p={0}
          bg="transparent"
          borderWidth={0}
          rounded={0}
          z={1}
        />
        <XStack position="absolute" r={12} t={12} z={2} gap={8} items="center">
          {current.delivery ? (
            <XStack
              testID="ads-carousel-delivery-badge"
              gap={6}
              items="center"
              rounded={999}
              py={4}
              px={10}
              bg="surface"
              borderWidth={1}
              borderColor="borderColor"
            >
              <Icon name="home" size={14} tone="accent" />
              <Paragraph fontSize={12} fontWeight="700" color="text">
                {dictionary.deliveryBadge}
              </Paragraph>
            </XStack>
          ) : null}
          <YStack
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
        </XStack>
        {items.length > 1 ? (
          <>
            <FlyerNavButton
              direction="previous"
              label={dictionary.previousAd}
              onPress={goPrevious}
            />
            <FlyerNavButton direction="next" label={dictionary.nextAd} onPress={goNext} />
          </>
        ) : null}
      </YStack>
      <AdsCarouselDetails
        item={current}
        isWide={isWide}
        nameFontSize={nameFontSize}
        meta={meta}
        schedule={schedule}
      />
      <FlyerLightbox item={openFlyer} onClose={() => setOpenFlyer(null)} />
    </YStack>
  );
}
