export type ResponsiveMedia = {
  readonly md: boolean;
};

export function getResponsiveMaxW(media: ResponsiveMedia): number {
  return media.md ? 1440 : 390;
}
