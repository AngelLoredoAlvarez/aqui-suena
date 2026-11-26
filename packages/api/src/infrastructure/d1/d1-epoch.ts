// Epoch (seconds-since-epoch) helpers for D1 timestamp columns.
// D1 stores timestamps as integer seconds; Date uses milliseconds.
//
// Lives in `infrastructure/d1/` — the neutral D1 context — because multiple
// bounded contexts (billing, directory, ...) need the same conversion; putting
// it in one context's folder would create a cross-context dependency.
export function toEpoch(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function fromEpoch(seconds: number | null): Date | null {
  if (seconds === null) return null;

  return new Date(seconds * 1000);
}
