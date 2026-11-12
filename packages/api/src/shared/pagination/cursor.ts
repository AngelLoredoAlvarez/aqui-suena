export type CursorPoint = {
  createdAt: number;
  id: string;
};

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
