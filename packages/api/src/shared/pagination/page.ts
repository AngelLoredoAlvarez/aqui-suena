import { encodeCursor } from "@aqui-suena/api/shared/pagination/cursor";

export type OffsetPage<T> = {
  items: T[];
  limit: number;
  offset: number;
  nextOffset: number | null;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

export function paginateOffset<T>(items: T[], limit: number, offset: number): OffsetPage<T> {
  return {
    items,
    limit,
    offset,
    nextOffset: items.length === limit ? offset + limit : null,
  };
}

export function paginateCursor<T extends { id: string; createdAt: number }>(
  rows: T[],
  limit: number,
): CursorPage<T> {
  const items = rows.slice(0, limit);
  const last = rows[limit - 1];

  if (rows.length <= limit || last === undefined) {
    return { items, nextCursor: null };
  }

  return {
    items,
    nextCursor: encodeCursor({ createdAt: last.createdAt, id: last.id }),
  };
}
