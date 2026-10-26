export type MetaSource = {
  readonly category: string;
  readonly delivery: boolean;
  readonly opensLabel?: string;
};

export type ComposeMetaOptions = {
  readonly isWide: boolean;
  readonly deliveryLabel: string;
};

// One shared composition for the card meta line across platforms:
// "category · delivery · opensLabel". Delivery is present only when true
// (no negative badge, per spec); opensLabel is mobile-only (wide shows the
// horario in its own row). Keeping this in a single function means mobile,
// tablet, and web never duplicate the presentation logic.
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
