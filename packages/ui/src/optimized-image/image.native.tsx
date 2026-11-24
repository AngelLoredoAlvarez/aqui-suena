import { createImage } from "@tamagui/image";
import { Image as ExpoImage, type ImageSource } from "expo-image";
import type { ComponentProps, ComponentType } from "react";

/**
 * Native image element backed by expo-image.
 *
 * `cacheKey` travels inside the expo-image source because the URI changes with
 * every signed-URL request while the underlying object key stays immutable.
 */
const StyledImage = createImage({
  Component: ExpoImage,
  mapObjectFitToResizeMode: (objectFit) => objectFit,
  resizeModePropName: "contentFit",
  objectPositionPropName: "contentPosition",
});

type StyledImageProps = ComponentProps<typeof StyledImage>;

/**
 * Tamagui marks `source` deprecated in favor of `src`, but expo-image's
 * `cacheKey` only exists inside its `ImageSource` object, so the adapter
 * intentionally uses that prop.
 */
const ExpoImageElement = StyledImage as ComponentType<
  Omit<StyledImageProps, "source"> & { readonly source?: ImageSource | null }
>;

/**
 * expo-image expects `contentPosition` in `"top center"` order, while the
 * shared component exposes CSS `"center top"`.
 */
function toContentPosition(objectPosition: StyledImageProps["objectPosition"]) {
  switch (objectPosition) {
    case "center top":
      return "top center";
    case "center bottom":
      return "bottom center";
    case "top":
      return "top";
    case "bottom":
      return "bottom";
    case "center":
      return "center";
    default:
      return undefined;
  }
}

/**
 * `createImage` wraps `onLoad` and reads the deprecated `event.nativeEvent`
 * payload. Forwarding the callback as `onLoadEnd` keeps expo-image's event
 * object untouched.
 */
export type ImageProps = Omit<StyledImageProps, "onLoad" | "onLoadEnd" | "source" | "src"> & {
  readonly src: string;
  readonly cacheKey?: string;
  readonly onLoad?: () => void;
};

export function Image({
  cacheKey,
  src,
  cachePolicy = "memory-disk",
  objectPosition,
  onLoad,
  draggable: _draggable,
  transition: _transition,
  ...props
}: ImageProps) {
  const expoSource: ImageSource = { uri: src, cacheKey };

  return (
    <ExpoImageElement
      {...props}
      source={expoSource}
      cachePolicy={cachePolicy}
      contentPosition={toContentPosition(objectPosition)}
      onLoadEnd={onLoad}
    />
  );
}
