export type ResponsiveMedia = {
  readonly md: boolean;
  readonly lg: boolean;
  readonly xl: boolean;
};

export function getResponsiveCarouselMaxW(media: ResponsiveMedia): number {
  if (media.xl) {
    return 1440;
  }
  if (media.lg) {
    return 1024;
  }
  if (media.md) {
    return 768;
  }
  return 390;
}

export function getResponsiveFlyerWidth(media: ResponsiveMedia): number | undefined {
  if (media.xl) {
    return 480;
  }
  if (media.lg || media.md) {
    return 330;
  }
  return undefined;
}
