import type { AdsCarouselItem } from "@aqui-suena/api/client";
import { useLocale } from "@aqui-suena/ui/i18n";
import { fitNameFontSize } from "@aqui-suena/ui/shared/utils/fit-name-font-size";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Button, isWeb, type TamaguiTextElement, Text, XStack, YStack } from "tamagui";

const BASE_NAME_FONT_SIZE = 14;
const MIN_NAME_FONT_SIZE = 8;

type CardBadgeTone = "ok" | "error" | "muted";

function CardBadge({
  testID,
  tone,
  children,
}: {
  testID: string;
  tone: CardBadgeTone;
  children: ReactNode;
}) {
  return (
    <Text
      testID={testID}
      color={tone}
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
      {children}
    </Text>
  );
}

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
  const [nameWidth, setNameWidth] = useState<number>();
  const nameRef = useRef<TamaguiTextElement>(null);
  const nameFontSize = fitNameFontSize(
    item.name,
    nameWidth,
    BASE_NAME_FONT_SIZE,
    MIN_NAME_FONT_SIZE,
  );

  useEffect(() => {
    if (!isWeb) return;

    const node = nameRef.current;
    if (!node || !("getBoundingClientRect" in node)) return;

    const element = node as HTMLElement;
    const updateWidth = (): void => {
      const width = element.getBoundingClientRect().width;
      if (width > 0) setNameWidth(width);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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
        <Text
          ref={nameRef}
          color="text"
          fontWeight="700"
          fontSize={nameFontSize}
          numberOfLines={1}
          style={{ textAlign: "left" }}
          flex={1}
          onLayout={
            isWeb
              ? undefined
              : (event: LayoutChangeEvent) => setNameWidth(event.nativeEvent.layout.width)
          }
        >
          {item.name}
        </Text>
        <CardBadge testID={`business-card-${item.id}-category`} tone="muted">
          {dictionary.category(item.category)}
        </CardBadge>
        <CardBadge testID={`business-card-${item.id}-status`} tone={item.isOpen ? "ok" : "error"}>
          {item.isOpen ? dictionary.open : dictionary.closed}
        </CardBadge>
      </XStack>
    </Button>
  );
}
