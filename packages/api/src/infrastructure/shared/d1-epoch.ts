// Shared epoch (seconds-since-epoch) helpers for D1 timestamp columns.
// D1 stores timestamps as integer seconds; Date uses milliseconds.
//
// Lives in `shared/` because multiple bounded contexts (billing, directory, ...)
// need the same conversion. Putting it in one module's folder would create a
// cross-context dependency (e.g. directory importing from billing).
export function toEpoch(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function fromEpoch(seconds: number | null): Date | null {
  if (seconds === null) return null;

  return new Date(seconds * 1000);
}
