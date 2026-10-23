export type ResponsiveMedia = {
  readonly md: boolean;
  readonly lg: boolean;
};

export function getResponsiveCarouselMaxW(media: ResponsiveMedia): number {
  if (media.lg) {
    return 1024;
  }
  if (media.md) {
    return 768;
  }
  return 390;
}
