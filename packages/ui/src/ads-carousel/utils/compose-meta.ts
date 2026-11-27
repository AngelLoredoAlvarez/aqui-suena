export type MetaSource = {
  readonly category: string;
  readonly delivery: boolean;
  readonly opensLabel?: string;
};

export type ComposeMetaOptions = {
  readonly isWide: boolean;
  readonly deliveryLabel: string;
};

export function composeMeta(source: MetaSource, options: ComposeMetaOptions): string {
  const segments: string[] = [source.category];
  if (source.delivery) {
    segments.push(options.deliveryLabel);
  }
  if (!options.isWide && source.opensLabel) {
    segments.push(source.opensLabel);
  }
  return segments.join(" · ");
}
