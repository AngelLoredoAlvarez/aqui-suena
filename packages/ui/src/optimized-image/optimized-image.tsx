import { Image } from "@aqui-suena/ui/optimized-image/image";
import { imageCacheKey } from "@aqui-suena/ui/optimized-image/image-cache-key";
import { imageLoadState } from "@aqui-suena/ui/optimized-image/image-load-state";
import { useEffect, useRef, useState } from "react";
import { YStack } from "tamagui";

export type OptimizedImageProps = {
  readonly src: string;
  readonly alt: string;
  readonly width?: number;
  readonly height?: number;
  readonly priority?: boolean;
  readonly blurDataURL?: string;
  readonly objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  readonly objectPosition?: "center" | "center top" | "center bottom" | "top" | "bottom";
  readonly rounded?: number;
  readonly fill?: boolean;
  readonly draggable?: boolean;
};

type ImageStatus = "idle" | "loading" | "loaded" | "error";

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  blurDataURL,
  objectFit,
  objectPosition = "center",
  rounded = 8,
  fill = false,
  draggable,
}: OptimizedImageProps) {
  const [status, setStatus] = useState<ImageStatus>(priority ? "loading" : "idle");
  const containerRef = useRef<Element | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const cacheKey = imageCacheKey(src);

  useEffect(() => {
    if (priority) {
      setStatus((current) => (current === "idle" ? "loading" : current));

      return;
    }
    const el = containerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setStatus("loading");
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setStatus("loading");
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [priority]);

  useEffect(() => {
    const settled = imageLoadState(imageRef.current);

    if (settled === "pending") {
      return;
    }

    setStatus((current) => (current === "error" ? current : settled));
  }, [src]);

  if (status === "error") {
    return (
      <YStack
        testID="optimized-image-error"
        width={fill ? "100%" : width}
        height={fill ? "100%" : height}
        items="center"
        justify="center"
        bg="surface2"
        rounded={rounded}
      />
    );
  }

  return (
    <YStack
      ref={(node) => {
        containerRef.current = node as Element | null;
      }}
      testID="optimized-image"
      position="relative"
      overflow="hidden"
      width={fill ? "100%" : width}
      height={fill ? "100%" : height}
      bg="surface2"
      rounded={rounded}
    >
      {blurDataURL && status !== "loaded" && (
        <Image
          src={blurDataURL}
          alt=""
          aria-hidden
          width={fill ? "100%" : width}
          height={fill ? "100%" : height}
          style={{ filter: "blur(8px)", transform: "scale(1.05)" }}
        />
      )}
      {status !== "idle" && (
        <Image
          ref={imageRef}
          src={src}
          alt={alt}
          cacheKey={cacheKey}
          draggable={draggable}
          width={fill ? "100%" : width}
          height={fill ? "100%" : height}
          objectFit={objectFit}
          objectPosition={objectPosition}
          onLoad={() => setStatus((current) => (current === "error" ? current : "loaded"))}
          onError={() => setStatus("error")}
          opacity={status === "loaded" ? 1 : 0}
          transition="quick"
          style={{ position: "absolute", inset: 0, objectPosition }}
        />
      )}
    </YStack>
  );
}
