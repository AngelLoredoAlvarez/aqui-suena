import { Button, Paragraph, Text } from "tamagui";

export type StationButtonProps = {
  readonly stationName: string;
  readonly ariaLabel: string;
  readonly chevron: string;
  readonly onOpenSheet?: () => void;
};

export function StationButton({
  stationName,
  ariaLabel,
  chevron,
  onOpenSheet,
}: StationButtonProps) {
  return (
    <Button
      variant="quiet"
      testID="station-name"
      onPress={() => onOpenSheet?.()}
      aria-haspopup="listbox"
      aria-label={ariaLabel}
      paddingInline={0}
      paddingBlock={0}
      borderWidth={0}
      minH={32}
      gap={6}
      opacity={1}
    >
      <Paragraph fontSize={17} fontWeight="700" color="brandCream">
        {stationName}
      </Paragraph>
      <Text fontSize={18} color="brandCream" aria-hidden={true} data-testid="station-chevron">
        {chevron}
      </Text>
    </Button>
  );
}
