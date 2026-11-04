// Shared epoch (seconds-since-epoch) helpers for D1 timestamp columns.
// D1 stores timestamps as integer seconds; Date uses milliseconds.
export function toEpoch(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function fromEpoch(seconds: number | null): Date | null {
  if (seconds === null) return null;

  return new Date(seconds * 1000);
}
