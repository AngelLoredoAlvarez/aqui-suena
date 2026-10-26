export type ResponsiveMedia = {
  readonly md: boolean;
  readonly lg: boolean;
  readonly xl: boolean;
};

// Card max width per design canvas: 390 mobile, 1024 tablet (lg), 1440 web
// (xl); 768 (md) is a transitional small-tablet width between them.
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

// Flyer image panel width on wide layouts; `undefined` on mobile means the
// flyer fills the card width (flex:1). Tablet (md/lg) 330, web (xl) 480.
export function getResponsiveFlyerWidth(media: ResponsiveMedia): number | undefined {
  if (media.xl) {
    return 480;
  }
  if (media.lg || media.md) {
    return 330;
  }
  return undefined;
}
