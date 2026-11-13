import type { CursorPoint } from "@aqui-suena/api/shared/pagination/cursor";
import { encodeCursor } from "@aqui-suena/api/shared/pagination/cursor";
import { paginateCursor, paginateOffset } from "@aqui-suena/api/shared/pagination/page";
import { describe, expect, it } from "vitest";

type Row = { id: string; createdAt: number };

function makeRow(id: string, createdAt: number): Row {
  return { id, createdAt };
}

describe("paginateOffset", () => {
  it("returns an empty page with nextOffset null", () => {
    expect(paginateOffset([], 20, 0)).toEqual({
      items: [],
      limit: 20,
      offset: 0,
      nextOffset: null,
    });
  });

  it("returns nextOffset null when the page is not full", () => {
    const items = [makeRow("a", 1), makeRow("b", 2)];

    expect(paginateOffset(items, 20, 0)).toEqual({
      items,
      limit: 20,
      offset: 0,
      nextOffset: null,
    });
  });

  it("returns nextOffset offset+limit when the page is full", () => {
    const items = Array.from({ length: 20 }, (_, i) => makeRow(`r${i}`, i));

    expect(paginateOffset(items, 20, 0).nextOffset).toBe(20);
    expect(paginateOffset(items, 20, 40).nextOffset).toBe(60);
  });

  it("preserves the exact items and offset", () => {
    const items = [makeRow("a", 1)];

    expect(paginateOffset(items, 20, 40)).toEqual({
      items,
      limit: 20,
      offset: 40,
      nextOffset: null,
    });
  });
});

describe("paginateCursor", () => {
  const toPoint = (row: Row): CursorPoint => ({
    createdAt: row.createdAt,
    id: row.id,
  });

  it("returns all rows and nextCursor null when there is no next page", () => {
    const rows = [makeRow("a", 1), makeRow("b", 2)];

    expect(paginateCursor(rows, 20, toPoint)).toEqual({ items: rows, nextCursor: null });
  });

  it("slices to limit and returns a cursor when there is a next page", () => {
    const rows = Array.from({ length: 21 }, (_, i) => makeRow(`r${i}`, i));
    const page = paginateCursor(rows, 20, toPoint);

    expect(page.items).toEqual(rows.slice(0, 20));
    expect(page.items).toHaveLength(20);
    expect(page.nextCursor).toBe(encodeCursor({ createdAt: 19, id: "r19" }));
  });

  it("returns a null cursor exactly at the boundary", () => {
    const rows = Array.from({ length: 20 }, (_, i) => makeRow(`r${i}`, i));

    expect(paginateCursor(rows, 20, toPoint)).toEqual({ items: rows, nextCursor: null });
  });
});
