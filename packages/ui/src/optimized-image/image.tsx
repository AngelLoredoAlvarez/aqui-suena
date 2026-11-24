import type { ComponentProps } from "react";
import { Image as TamaguiImage } from "tamagui";

export type ImageProps = ComponentProps<typeof TamaguiImage> & {
  readonly cacheKey?: string;
};

/**
 * Web image element. Browsers key their HTTP cache by the full URL, so the
 * native-only `cacheKey` is intentionally ignored here; web cache handling is
 * tracked separately.
 */
export function Image({ cacheKey, ...props }: ImageProps) {
  void cacheKey;

  return <TamaguiImage {...props} />;
}
