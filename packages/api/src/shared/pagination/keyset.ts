import {
  type CursorPoint,
  compareCursorPoints,
  decodeCursor,
} from "@aqui-suena/api/shared/pagination/cursor";
import { type CursorPage, paginateCursor } from "@aqui-suena/api/shared/pagination/page";

function isAfterCursorPoint(point: CursorPoint, cursor: CursorPoint): boolean {
  if (point.createdAt !== cursor.createdAt) return point.createdAt > cursor.createdAt;

  return point.id > cursor.id;
}

export function paginateKeyset<T>(
  items: T[],
  input: { limit: number; cursor: string | null },
  toPoint: (item: T) => CursorPoint,
): CursorPage<T> {
  const sorted = [...items].sort((a, b) => compareCursorPoints(toPoint(a), toPoint(b)));

  const point = input.cursor === null ? null : decodeCursor(input.cursor);

  const after =
    point === null ? sorted : sorted.filter((item) => isAfterCursorPoint(toPoint(item), point));

  const rows = after.slice(0, input.limit + 1);

  return paginateCursor(rows, input.limit, toPoint);
}
