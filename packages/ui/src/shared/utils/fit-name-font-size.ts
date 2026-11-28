const DEFAULT_MIN_NAME_FONT_SIZE = 16;
const AVERAGE_CHAR_WIDTH_EM = 0.55;

export function fitNameFontSize(
  name: string,
  availableWidth: number | undefined,
  maxSize: number,
  minSize: number = DEFAULT_MIN_NAME_FONT_SIZE,
): number {
  if (!availableWidth || name.length === 0) {
    return maxSize;
  }

  const fitted = Math.floor(availableWidth / (name.length * AVERAGE_CHAR_WIDTH_EM));

  return Math.max(minSize, Math.min(maxSize, fitted));
}
