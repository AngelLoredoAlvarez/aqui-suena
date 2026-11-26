import { flyerLayerStyle } from "@aqui-suena/ui/ads-carousel/flyer-animation";
import { useLocale } from "@aqui-suena/ui/i18n";
import { Icon } from "@aqui-suena/ui/shared";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Button, isWeb, Text, XStack, YStack } from "tamagui";

export function ContactRow({ label, value }: { label: string; value: string }) {
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

export function ContactActions() {
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

export function FlyerNavButton({
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

export function FlyerTransition({ children }: { children: ReactNode }) {
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
