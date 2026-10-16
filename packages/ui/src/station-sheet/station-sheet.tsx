import { useLocale } from "@aqui-suena/ui/i18n";
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
// handle is visual-only until gestures land; backdrop tap and the close
// button dismiss.
export function StationSheet({
  open,
  stations,
  activeStationId,
  onSelectStation,
  onClose,
}: StationSheetProps) {
  const { dictionary } = useLocale();

  if (!open) {
    return null;
  }

  return (
    <>
      <YStack
        testID="station-sheet-backdrop"
        position={isWeb ? "fixed" : "absolute"}
        t={0}
        l={0}
        r={0}
        b={0}
        bg="$bg"
        opacity={0.7}
        z={1}
        cursor="pointer"
        onPress={onClose}
      />
      <YStack
        testID="station-sheet"
        position="absolute"
        l={0}
        r={0}
        b={0}
        z={2}
        gap="$3"
        p="$4"
        bg="$surface"
        borderColor="$borderColor"
        borderWidth={1}
        rounded={24}
      >
        <XStack width={40} height={4} rounded={999} bg="$muted" self="center" />
        <XStack items="center" justify="space-between">
          <Paragraph fontSize="$6" fontWeight="700" color="$text">
            {dictionary.sheetTitle}
          </Paragraph>
        </XStack>
        <ScrollView width="100%" maxH={320}>
          <YStack gap="$2">
            {stations.map((station) => {
              const active = station.id === activeStationId;
              return (
                <Button
                  key={station.id}
                  testID="station-sheet-row"
                  type="button"
                  minH={44}
                  rounded={999}
                  bg={active ? "$surface2" : "transparent"}
                  borderColor={active ? "$accent" : "$borderColor"}
                  borderWidth={1}
                  onPress={() => {
                    onSelectStation(station.id);
                    onClose();
                  }}
                  aria-label={station.name}
                >
                  <XStack gap="$2" items="center" width="100%">
                    <XStack
                      testID="station-sheet-dot"
                      width={12}
                      height={12}
                      rounded={100}
                      bg={active ? "$ok" : "$muted"}
                    />
                    <YStack flex={1} items="flex-start">
                      <Paragraph color="$text">{station.name}</Paragraph>
                      {station.live ? (
                        <Paragraph fontSize="$3" color="$muted">
                          {dictionary.liveBadge}
                        </Paragraph>
                      ) : null}
                    </YStack>
                    {active ? (
                      <Paragraph
                        testID="station-sheet-check"
                        fontSize="$5"
                        fontWeight="700"
                        color="$accent"
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
    </>
  );
}
