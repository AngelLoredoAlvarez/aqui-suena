import { useLocale } from "@aqui-suena/ui/i18n";
import { Button, isWeb, Paragraph, ScrollView, useMedia, XStack, YStack } from "tamagui";
import { useEscapeToClose } from "./use-escape-to-close";

export type SheetStation = {
  readonly id: string;
  readonly name: string;
  readonly live: boolean;
};

export type StationSheetProps = {
  readonly open: boolean;
  readonly stations: readonly SheetStation[];
  readonly activeStationId?: string;
  readonly onSelectStation: (stationId: string) => void;
  readonly onClose: () => void;
};

// Bottom overlay (EstacionesSheet): floats above the player over a dimmed
// backdrop, per the reference image. Closed renders nothing. The drag
// handle is visual-only until gestures land; backdrop tap, Escape, or
// choosing a station dismiss.

export function StationSheetBackdrop({
  onClose,
  dim = true,
  zIndex = 1,
  bottom = 0,
}: {
  onClose: () => void;
  dim?: boolean;
  zIndex?: number;
  bottom?: number;
}) {
  return (
    <YStack
      testID="station-sheet-backdrop"
      position={isWeb ? "fixed" : "absolute"}
      t={0}
      l={0}
      r={0}
      b={bottom}
      bg={dim ? "bg" : "transparent"}
      opacity={dim ? 0.7 : undefined}
      z={zIndex}
      cursor="pointer"
      onPress={onClose}
    />
  );
}

export function StationSheetCard({
  stations,
  activeStationId,
  onSelectStation,
  onClose,
}: {
  stations: readonly SheetStation[];
  activeStationId?: string;
  onSelectStation: (stationId: string) => void;
  onClose: () => void;
}) {
  const { dictionary } = useLocale();
  const media = useMedia();
  // Tablet and up anchor the selector to the dock's right edge as a compact
  // popover (design sections 09 and 11) instead of a full-bleed sheet.
  const isWide = media.md;

  return (
    <YStack
      testID="station-sheet"
      position="relative"
      z={1}
      width="100%"
      maxW={isWide ? 480 : undefined}
      self={isWide ? "flex-end" : undefined}
      mb="2"
      gap="3"
      p="4"
      bg="surface"
      borderColor="borderColor"
      borderWidth={1}
      rounded={24}
      pointerEvents="auto"
    >
      {isWide ? null : <XStack width={40} height={4} rounded={999} bg="muted" self="center" />}
      <XStack items="center" justify="space-between">
        <Paragraph fontSize="6" fontWeight="700" color="text">
          {dictionary.sheetTitle}
        </Paragraph>
      </XStack>
      <ScrollView width="100%" maxH={320}>
        <YStack gap="2">
          {stations.map((station) => {
            const active = station.id === activeStationId;
            return (
              <Button
                key={station.id}
                testID="station-sheet-row"
                type="button"
                height={56}
                minH={56}
                paddingInline={12}
                paddingBlock={0}
                rounded={16}
                bg={active ? "surface2" : "transparent"}
                borderWidth={0}
                onPress={() => {
                  onSelectStation(station.id);
                  onClose();
                }}
                aria-label={station.name}
              >
                <XStack gap="2" items="center" width="100%">
                  <XStack
                    testID="station-sheet-dot"
                    width={10}
                    height={10}
                    rounded={100}
                    bg={active ? "ok" : "borderColor"}
                  />
                  <YStack flex={1} items="flex-start">
                    <Paragraph color="text" fontWeight="700">
                      {station.name}
                    </Paragraph>
                    {station.live ? (
                      <Paragraph fontSize={13} color="muted">
                        {dictionary.liveBadge}
                      </Paragraph>
                    ) : null}
                  </YStack>
                  {active ? (
                    <Paragraph
                      testID="station-sheet-check"
                      fontSize="5"
                      fontWeight="700"
                      color="accent"
                    >
                      ✓
                    </Paragraph>
                  ) : null}
                </XStack>
              </Button>
            );
          })}
        </YStack>
      </ScrollView>
    </YStack>
  );
}

export function StationSheet({
  open,
  stations,
  activeStationId,
  onSelectStation,
  onClose,
}: StationSheetProps) {
  useEscapeToClose(open, onClose);

  if (!open) {
    return null;
  }

  return (
    <>
      <StationSheetBackdrop onClose={onClose} />
      <StationSheetCard
        stations={stations}
        activeStationId={activeStationId}
        onSelectStation={onSelectStation}
        onClose={onClose}
      />
    </>
  );
}
