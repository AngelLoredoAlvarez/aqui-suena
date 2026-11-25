import type { FlyerLightboxProps } from "@aqui-suena/ui/flyer-lightbox/flyer-lightbox";
import { useLocale } from "@aqui-suena/ui/i18n";
import { OptimizedImage } from "@aqui-suena/ui/optimized-image";
import { Icon } from "@aqui-suena/ui/shared";
import { ZoomableImage } from "@aqui-suena/ui/zoomable-image/zoomable-image.native";
import { Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, YStack } from "tamagui";

export type {
  FlyerLightboxItem,
  FlyerLightboxProps,
} from "@aqui-suena/ui/flyer-lightbox/flyer-lightbox";

export function FlyerLightbox({ item, onClose }: FlyerLightboxProps) {
  const { dictionary } = useLocale();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={item !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {item === null ? null : (
        <YStack
          testID="flyer-lightbox"
          aria-label={dictionary.fullscreenFlyer}
          accessibilityViewIsModal
          flex={1}
          width="100%"
          height="100%"
          bg="bg"
          items="center"
          justify="center"
        >
          <ZoomableImage key={item.id}>
            <OptimizedImage
              src={item.imageUrl}
              alt={item.alt}
              fill
              objectFit="contain"
              rounded={0}
              priority
              draggable={false}
            />
          </ZoomableImage>
          <Button
            testID="flyer-lightbox-close"
            type="button"
            aria-label={dictionary.closeFlyer}
            onPress={onClose}
            position="absolute"
            t={insets.top + 12}
            r={12}
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
            <Icon name="x" size={22} tone="text" />
          </Button>
        </YStack>
      )}
    </Modal>
  );
}
