import { XStack, YStack } from "tamagui";

export type PaginationDotsProps = {
  readonly count: number;
  readonly activeIndex: number;
  readonly label: string;
};

export function PaginationDots({ count, activeIndex, label }: PaginationDotsProps) {
  return (
    <XStack position="absolute" b={12} l={0} r={0} justify="center" pointerEvents="none">
      <XStack role="group" aria-label={label} gap={6} py={7} px={10} rounded={999} bg="surface">
        {Array.from({ length: count }).map((_, i) => (
          <YStack
            key={i}
            testID="ads-carousel-dot"
            data-active={i === activeIndex ? "true" : undefined}
            width={i === activeIndex ? 24 : 8}
            height={8}
            rounded={999}
            bg={i === activeIndex ? "accent" : "muted"}
          />
        ))}
      </XStack>
    </XStack>
  );
}
