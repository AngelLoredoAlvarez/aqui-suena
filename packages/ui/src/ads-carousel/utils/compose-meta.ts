export type MetaSource = {
  readonly category: string;
  readonly opensLabel?: string;
};

export type ComposeMetaOptions = {
  readonly isWide: boolean;
};

export function composeMeta(source: MetaSource, options: ComposeMetaOptions): string {
  const segments: string[] = [source.category];
  if (!options.isWide && source.opensLabel) {
    segments.push(source.opensLabel);
  }
  return segments.join(" · ");
}
