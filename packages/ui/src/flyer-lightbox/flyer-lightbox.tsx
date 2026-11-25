import { downloadFlyer } from "@aqui-suena/ui/flyer-lightbox/download-flyer";
import { FlyerLightboxMenu } from "@aqui-suena/ui/flyer-lightbox/lightbox-menu";
import { useLocale } from "@aqui-suena/ui/i18n";
import { OptimizedImage } from "@aqui-suena/ui/optimized-image";
import { Icon } from "@aqui-suena/ui/shared";
import { useEscapeToClose } from "@aqui-suena/ui/station-sheet/use-escape-to-close";
import type { ZoomableImageHandle } from "@aqui-suena/ui/zoomable-image/types";
import { ZoomableImage } from "@aqui-suena/ui/zoomable-image/zoomable-image";
import { useEffect, useRef, useState } from "react";
import { Button, YStack } from "tamagui";

export type FlyerLightboxItem = {
  readonly id: string;
  readonly imageUrl: string;
  readonly alt: string;
  readonly name: string;
};

export type FlyerLightboxProps = {
  readonly item: FlyerLightboxItem | null;
  readonly onClose: () => void;
};

export function FlyerLightbox({ item, onClose }: FlyerLightboxProps) {
  const { dictionary } = useLocale();
  const zoomRef = useRef<ZoomableImageHandle | null>(null);
  const [scale, setScale] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const itemId = item?.id ?? null;

  useEffect(() => {
    setScale(1);
  }, [itemId]);

  useEscapeToClose(item !== null, onClose);

  if (item === null) {
    return null;
  }

  const handleDownload = async (): Promise<void> => {
    setDownloading(true);

    try {
      await downloadFlyer(item.imageUrl, item.name);
    } catch (error) {
      console.error("Failed to download the flyer", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <YStack
      testID="flyer-lightbox"
      role="dialog"
      aria-modal={true}
      aria-label={dictionary.fullscreenFlyer}
      position="fixed"
      t={0}
      l={0}
      r={0}
      b={0}
      z={1000}
      bg="bg"
      items="center"
      justify="center"
    >
      <ZoomableImage key={item.id} ref={zoomRef} onTap={onClose} onScaleChange={setScale}>
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
        bottom={24}
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
        t={12}
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
  );
}
