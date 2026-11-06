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
