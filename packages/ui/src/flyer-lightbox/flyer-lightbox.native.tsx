import { downloadFlyer } from "@aqui-suena/ui/flyer-lightbox/download-flyer.native";
import type { FlyerLightboxProps } from "@aqui-suena/ui/flyer-lightbox/flyer-lightbox";
import { FlyerLightboxMenu } from "@aqui-suena/ui/flyer-lightbox/lightbox-menu";
import { useLocale } from "@aqui-suena/ui/i18n";
import { OptimizedImage } from "@aqui-suena/ui/optimized-image";
import { Icon } from "@aqui-suena/ui/shared";
import type { ZoomableImageHandle } from "@aqui-suena/ui/zoomable-image/types";
import { ZoomableImage } from "@aqui-suena/ui/zoomable-image/zoomable-image.native";
import { useEffect, useRef, useState } from "react";
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
  const zoomRef = useRef<ZoomableImageHandle | null>(null);
  const [scale, setScale] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const itemId = item?.id ?? null;

  useEffect(() => {
    setScale(1);
  }, [itemId]);

  const handleDownload = async (): Promise<void> => {
    if (item === null) {
      return;
    }

    setDownloading(true);

    try {
      await downloadFlyer(item.imageUrl, item.name);
    } catch (error) {
      console.error("flyer download failed", error);
    } finally {
      setDownloading(false);
    }
  };

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
          <ZoomableImage key={item.id} ref={zoomRef} onScaleChange={setScale}>
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
          <FlyerLightboxMenu
            scale={scale}
            bottom={insets.bottom + 16}
            downloading={downloading}
            onZoomIn={() => zoomRef.current?.zoomIn()}
            onZoomOut={() => zoomRef.current?.zoomOut()}
            onReset={() => zoomRef.current?.reset()}
            onDownload={() => void handleDownload()}
          />
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
