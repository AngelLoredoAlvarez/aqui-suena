export type ThumbGeometry = {
  readonly offset: number;
  readonly size: number;
  readonly visible: boolean;
};

export function computeThumbGeometry({
  viewport,
  content,
  scrollOffset,
  minSize = 24,
}: {
  viewport: number;
  content: number;
  scrollOffset: number;
  minSize?: number;
}): ThumbGeometry {
  if (viewport <= 0 || content <= viewport) {
    return { offset: 0, size: 0, visible: false };
  }

  const size = Math.min(viewport, Math.max(minSize, (viewport / content) * viewport));
  const maxThumbOffset = viewport - size;
  const maxScroll = content - viewport;
  const safeOffset = Math.min(Math.max(scrollOffset, 0), maxScroll);
  const offset = maxScroll > 0 ? (safeOffset / maxScroll) * maxThumbOffset : 0;

  return { offset, size, visible: true };
}
