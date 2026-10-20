import { useLocale } from "@aqui-suena/ui/i18n";
import { useEffect } from "react";
import { Button, isWeb, Paragraph, ScrollView, XStack, YStack } from "tamagui";

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
export function useEscapeToClose(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (typeof document === "undefined" || !open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);
}

export function StationSheetBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <YStack
      testID="station-sheet-backdrop"
      position={isWeb ? "fixed" : "absolute"}
      t={0}
      l={0}
      r={0}
      b={0}
      bg="bg"
      opacity={0.7}
      z={1}
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

  return (
    <YStack
      testID="station-sheet"
      position="relative"
      z={1}
      width="100%"
      mb="2"
      gap="3"
      p="4"
      bg="surface"
      borderColor="borderColor"
      borderWidth={1}
      rounded={24}
    >
      <XStack width={40} height={4} rounded={999} bg="muted" self="center" />
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
                height={44}
                minH={44}
                paddingInline={18}
                paddingBlock={1}
                rounded={999}
                bg={active ? "surface2" : "transparent"}
                borderColor={active ? "accent" : "borderColor"}
                borderWidth={1}
                onPress={() => {
                  onSelectStation(station.id);
                  onClose();
                }}
                aria-label={station.name}
              >
                <XStack gap="2" items="center" width="100%">
                  <XStack
                    testID="station-sheet-dot"
                    width={12}
                    height={12}
                    rounded={100}
                    bg={active ? "ok" : "muted"}
                  />
                  <YStack flex={1} items="flex-start">
                    <Paragraph color="text">{station.name}</Paragraph>
                    {station.live ? (
                      <Paragraph fontSize="3" color="muted">
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
