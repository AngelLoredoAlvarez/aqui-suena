/**
 * Stable cache key for an image URL.
 *
 * R2 signed URLs carry rotating `X-Amz-*` query parameters, so the raw URL
 * cannot identify the cached object across requests. Object keys are immutable,
 * so origin + pathname is a stable identity for the same bytes.
 */
export function imageCacheKey(src: string): string {
  try {
    const url = new URL(src);

    return `${url.origin}${url.pathname}`;
  } catch {
    return src;
  }
}
