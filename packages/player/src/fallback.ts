export function pickFallbackUrl(
  triedUrls: Readonly<string[]>,
  candidates: Readonly<string[]>,
): string | null {
  for (const candidate of candidates) {
    if (!triedUrls.includes(candidate)) {
      return candidate;
    }
  }
  return null;
}
