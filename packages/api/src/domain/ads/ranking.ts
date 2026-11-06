// Deterministic sponsor ranking for the ads carousel.
//
// Higher plan priority always wins; recency breaks ties. Ineligible sponsors
// (no active subscription / expired plan) are dropped before ranking so they
// never appear in the carousel. The function is pure and never mutates its
// input.

export type SponsorInput = {
  readonly id: string;
  readonly priority: number;
  readonly updatedAt: number;
  readonly eligible?: boolean;
};

export function rankSponsors(input: readonly SponsorInput[]): SponsorInput[] {
  return input
    .filter((sponsor) => sponsor.eligible !== false)
    .slice()
    .sort((a, b) => b.priority - a.priority || b.updatedAt - a.updatedAt);
}

// Carousel slot selection: expands each eligible sponsor into its allocated
// number of appearances per cycle (Comunidad 1, Oficios 2, Comercios 3) and
// interleaves them so the same sponsor never appears in consecutive slots,
// while favouring higher priority. Pure and deterministic.
export type CarouselSlotInput = {
  readonly id: string;
  readonly priority: number;
  readonly updatedAt: number;
  readonly appearances: number;
  readonly eligible?: boolean;
};

export function selectCarouselSlots(input: readonly CarouselSlotInput[]): string[] {
  const eligible = input.filter((sponsor) => sponsor.eligible !== false);

  const sorted = [...eligible].sort((a, b) => b.priority - a.priority || b.updatedAt - a.updatedAt);

  const remaining = new Map<string, number>();

  for (const sponsor of sorted) {
    remaining.set(sponsor.id, (remaining.get(sponsor.id) ?? 0) + sponsor.appearances);
  }

  const result: string[] = [];
  const total = [...remaining.values()].reduce((sum, count) => sum + count, 0);

  let last: string | null = null;

  for (let i = 0; i < total; i++) {
    // Prefer the sponsor with the most remaining slots that is not the last
    // placed one, to avoid consecutive repeats.
    let chosen: string | null = null;
    let max = -1;

    for (const [id, count] of remaining) {
      if (id === last || count <= 0) continue;

      if (count > max) {
        max = count;
        chosen = id;
      }
    }

    // Fallback: if every remaining sponsor is the last placed one, take the
    // one with the most slots left (unavoidable repeat).
    if (chosen === null) {
      for (const [id, count] of remaining) {
        if (count <= 0) continue;

        if (count > max) {
          max = count;
          chosen = id;
        }
      }
    }

    if (chosen === null) break;

    result.push(chosen);

    remaining.set(chosen, (remaining.get(chosen) ?? 0) - 1);

    last = chosen;
  }

  return result;
}
