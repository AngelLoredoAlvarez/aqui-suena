import { type CursorPoint, compareCursorPoints } from "@aqui-suena/api/shared/pagination/cursor";
import { type OffsetPage, paginateOffset } from "@aqui-suena/api/shared/pagination/page";

export function paginateOffsetRows<T>(
  items: T[],
  input: { limit: number; offset: number },
  toPoint: (item: T) => CursorPoint,
): OffsetPage<T> {
  const sorted = [...items].sort((a, b) => compareCursorPoints(toPoint(a), toPoint(b)));

  const rows = sorted.slice(input.offset, input.offset + input.limit);

  return paginateOffset(rows, input.limit, input.offset);
}
