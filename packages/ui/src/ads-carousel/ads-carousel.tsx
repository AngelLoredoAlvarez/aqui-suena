import type { AdsCarouselItem } from "@aqui-suena/api/client";
import { composeMeta } from "@aqui-suena/ui/ads-carousel/compose-meta";
import { flyerLayerStyle } from "@aqui-suena/ui/ads-carousel/flyer-animation";
import { formatSchedule } from "@aqui-suena/ui/ads-carousel/format-schedule";
import {
  getResponsiveCarouselMaxW,
  getResponsiveFlyerWidth,
} from "@aqui-suena/ui/ads-carousel/responsive";
import { swipeDirection } from "@aqui-suena/ui/ads-carousel/swipe-navigation";
import { useLocale } from "@aqui-suena/ui/i18n";
import { OptimizedImage } from "@aqui-suena/ui/optimized-image";
import { Icon } from "@aqui-suena/ui/shared";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, isWeb, Paragraph, Text, useMedia, XStack, YStack } from "tamagui";

export type { AdsCarouselItem } from "@aqui-suena/api/client";

export type AdsCarouselProps = {
  readonly items?: readonly AdsCarouselItem[];
  readonly autoAdvanceMs?: number;
};

const DEFAULT_AUTO_ADVANCE_MS = 5000;

type DragEvent = { nativeEvent: { clientX: number; clientY: number } };

function ContactRow({ label, value }: { label: string; value: string }) {
  return (
    <Button
      type="button"
      width="100%"
      minH={52}
      p={0}
      bg="transparent"
      borderWidth={0}
      borderBottomWidth={1}
      borderColor="borderColor"
      flexDirection="row"
      items="center"
      justify="flex-start"
      gap={12}
      onPress={() => {}}
    >
      <YStack flex={1} minW={0} items="flex-start" gap={2}>
        <Text color="muted" fontSize={12}>
          {label}
        </Text>
        <Text color="text" fontWeight="700" fontSize={14} numberOfLines={2}>
          {value}
        </Text>
      </YStack>
      <Icon name="chevron-right" size={18} tone="text" />
    </Button>
  );
}

function ContactActions() {
  const { dictionary } = useLocale();

  return (
    <XStack gap={8} mt="auto" pt={8}>
      <Button
        flex={1}
        minH={48}
        rounded={999}
        bg="accent"
        p={0}
        px={6}
        items="center"
        justify="center"
        onPress={() => {}}
      >
        <Text color="onAccent" fontWeight="700" fontSize={12} numberOfLines={1}>
          {dictionary.call}
        </Text>
      </Button>
      <Button
        flex={1}
        minH={48}
        rounded={999}
        bg="surface2"
        p={0}
        px={6}
        items="center"
        justify="center"
        onPress={() => {}}
      >
        <Text color="text" fontWeight="700" fontSize={12} numberOfLines={1}>
          {dictionary.whatsapp}
        </Text>
      </Button>
      <Button
        flex={1}
        minH={48}
        rounded={999}
        bg="surface2"
        p={0}
        px={6}
        items="center"
        justify="center"
        onPress={() => {}}
      >
        <Text color="text" fontWeight="700" fontSize={12} numberOfLines={1}>
          {dictionary.directions}
        </Text>
      </Button>
    </XStack>
  );
}

function FlyerNavButton({
  direction,
  label,
  onPress,
}: {
  direction: "previous" | "next";
  label: string;
  onPress: () => void;
}) {
  const isPrevious = direction === "previous";

  return (
    <Button
      testID={`ads-carousel-${direction}`}
      type="button"
      aria-label={label}
      onPress={onPress}
      position="absolute"
      t="50%"
      mt={-22}
      {...(isPrevious ? { l: 12 } : { r: 12 })}
      width={44}
      height={44}
      p={0}
      rounded={22}
      bg="surface"
      borderWidth={1}
      borderColor="borderColor"
      items="center"
      justify="center"
      z={2}
    >
      <Icon name={isPrevious ? "chevron-left" : "chevron-right"} size={22} tone="text" />
    </Button>
  );
}

function FlyerTransition({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));

    return () => cancelAnimationFrame(frame);
  }, []);

  const layer = flyerLayerStyle(isWeb, shown);

  if (!isWeb) {
    return (
      <YStack
        testID="ads-carousel-flyer-layer"
        animation="quickLessBouncy"
        opacity={layer.opacity}
        x={layer.x}
        flex={1}
        width="100%"
        overflow="hidden"
      >
        {children}
      </YStack>
    );
  }

  return (
    <YStack
      testID="ads-carousel-flyer-layer"
      animation="quickLessBouncy"
      opacity={layer.opacity}
      x={layer.x}
      position="absolute"
      inset={0}
    >
      {children}
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
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

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

  const handlePointerDown = (event: DragEvent): void => {
    dragStart.current = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY };
    setDragging(true);
  };

  const handlePointerMove = (event: DragEvent): void => {
    const start = dragStart.current;

    if (start === null) return;

    const direction = swipeDirection(
      event.nativeEvent.clientX - start.x,
      event.nativeEvent.clientY - start.y,
    );

    if (direction === null) return;

    dragStart.current = null;

    if (direction === "next") {
      goNext();
    } else {
      goPrevious();
    }
  };

  const stopDragging = (): void => {
    dragStart.current = null;
    setDragging(false);
  };

  const handlePointerUp = (event: DragEvent): void => {
    handlePointerMove(event);
    stopDragging();
  };

  const isPaused = paused || dragging;

  useEffect(() => {
    if (!hasItems || isPaused) return;
    const id = setInterval(advance, autoAdvanceMs);
    return () => clearInterval(id);
  }, [hasItems, isPaused, autoAdvanceMs, advance, safeIndex]);

  if (!hasItems) {
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
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onTouchCancel={() => setPaused(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={stopDragging}
      onPointerLeave={stopDragging}
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
            objectFit="cover"
            objectPosition="center top"
            rounded={0}
            priority
            draggable={false}
          />
        </FlyerTransition>
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
      <YStack flex={isWide ? 1 : undefined} p={isWide ? 24 : 16} gap={6}>
        <Paragraph fontWeight="700" fontSize={nameFontSize}>
          {current.name}
        </Paragraph>
        <Paragraph color="muted" fontSize={14}>
          {meta}
        </Paragraph>
        {isWide ? (
          <>
            <YStack width="100%" mt={8}>
              {current.phone ? <ContactRow label={dictionary.phone} value={current.phone} /> : null}
              {current.phone ? (
                <ContactRow label={dictionary.whatsapp} value={current.phone} />
              ) : null}
              {current.address ? (
                <ContactRow label={dictionary.address} value={current.address} />
              ) : null}
              {schedule ? <ContactRow label={dictionary.schedule} value={schedule} /> : null}
            </YStack>
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
            >
              <Text color="text" fontWeight="700" fontSize={14}>
                {dictionary.viewBusiness}
              </Text>
              <Icon name="arrow-right" size={18} tone="text" />
            </Button>
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
    </YStack>
  );
}
