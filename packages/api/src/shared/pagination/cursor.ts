export type CursorPoint = {
  createdAt: number;
  id: string;
};

export function toEpochSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function encodeCursor(point: CursorPoint): string {
  return btoa(JSON.stringify([point.createdAt, point.id]));
}

export function decodeCursor(cursor: string): CursorPoint | null {
  let decoded: string;

  try {
    decoded = atob(cursor);
  } catch {
    return null;
  }

  let value: unknown;

  try {
    value = JSON.parse(decoded);
  } catch {
    return null;
  }

  if (!Array.isArray(value) || value.length !== 2) {
    return null;
  }

  const [createdAt, id] = value;

  if (typeof createdAt !== "number" || !Number.isSafeInteger(createdAt)) {
    return null;
  }

  if (typeof id !== "string" || id.length === 0) {
    return null;
  }

  return { createdAt, id };
}

export function compareCursorPoints(a: CursorPoint, b: CursorPoint): number {
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;

  if (a.id < b.id) return -1;

  if (a.id > b.id) return 1;

  return 0;
}
