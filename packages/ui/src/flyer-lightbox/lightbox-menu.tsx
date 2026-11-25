import { useLocale } from "@aqui-suena/ui/i18n";
import { Icon, type IconName } from "@aqui-suena/ui/shared";
import { MAX_SCALE, MIN_SCALE } from "@aqui-suena/ui/zoomable-image/zoom";
import { Button, XStack } from "tamagui";

export type FlyerLightboxMenuProps = {
  readonly scale: number;
  readonly bottom: number;
  readonly downloading: boolean;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onReset: () => void;
  readonly onDownload: () => void;
};

function MenuButton({
  testID,
  label,
  icon,
  disabled,
  onPress,
}: {
  testID: string;
  label: string;
  icon: IconName;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      testID={testID}
      type="button"
      aria-label={label}
      disabled={disabled}
      opacity={disabled ? 0.4 : 1}
      onPress={onPress}
      width={44}
      height={44}
      p={0}
      rounded={22}
      bg="transparent"
      borderWidth={0}
      items="center"
      justify="center"
    >
      <Icon name={icon} size={20} tone="text" />
    </Button>
  );
}

export function FlyerLightboxMenu({
  scale,
  bottom,
  downloading,
  onZoomIn,
  onZoomOut,
  onReset,
  onDownload,
}: FlyerLightboxMenuProps) {
  const { dictionary } = useLocale();
  const atMin = scale <= MIN_SCALE;
  const atMax = scale >= MAX_SCALE;

  return (
    <XStack
      testID="flyer-lightbox-menu"
      position="absolute"
      l={0}
      r={0}
      b={bottom}
      justify="center"
      pointerEvents="box-none"
      z={2}
    >
      <XStack gap={2} p={4} rounded={999} bg="surface" borderWidth={1} borderColor="borderColor">
        <MenuButton
          testID="flyer-zoom-out"
          label={dictionary.zoomOut}
          icon="minus"
          disabled={atMin}
          onPress={onZoomOut}
        />
        <MenuButton
          testID="flyer-zoom-in"
          label={dictionary.zoomIn}
          icon="plus"
          disabled={atMax}
          onPress={onZoomIn}
        />
        <MenuButton
          testID="flyer-zoom-reset"
          label={dictionary.resetZoom}
          icon="reset"
          disabled={atMin}
          onPress={onReset}
        />
        <MenuButton
          testID="flyer-download"
          label={dictionary.downloadFlyer}
          icon="download"
          disabled={downloading}
          onPress={onDownload}
        />
      </XStack>
    </XStack>
  );
}
