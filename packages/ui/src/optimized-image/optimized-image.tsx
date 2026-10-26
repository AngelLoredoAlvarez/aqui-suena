import { useEffect, useRef, useState } from "react";
import { Image, YStack } from "tamagui";

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
}: OptimizedImageProps) {
  const [status, setStatus] = useState<ImageStatus>(priority ? "loading" : "idle");
  const containerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (priority) {
      setStatus("loading");
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

  if (status === "error") {
    return (
      <YStack
        testID="optimized-image-error"
        width={width}
        height={height}
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
      width={width}
      height={height}
      bg="surface2"
      rounded={rounded}
    >
      {blurDataURL && status !== "loaded" && (
        <Image
          src={blurDataURL}
          alt=""
          aria-hidden
          width={width}
          height={height}
          style={{ filter: "blur(8px)", transform: "scale(1.05)" }}
        />
      )}
      {status !== "idle" && (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          objectFit={objectFit}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          opacity={status === "loaded" ? 1 : 0}
          animation="quick"
          style={{ position: "absolute", inset: 0, objectPosition }}
        />
      )}
    </YStack>
  );
}
