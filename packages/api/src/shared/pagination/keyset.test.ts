import type { CursorPoint } from "@aqui-suena/api/shared/pagination/cursor";
import { encodeCursor } from "@aqui-suena/api/shared/pagination/cursor";
import { paginateKeyset } from "@aqui-suena/api/shared/pagination/keyset";
import { describe, expect, it } from "vitest";

type Row = { id: string; createdAt: number };

const toPoint = (row: Row): CursorPoint => ({ createdAt: row.createdAt, id: row.id });

function makeRow(id: string, createdAt: number): Row {
  return { id, createdAt };
}

describe("paginateKeyset", () => {
  it("sorts by (createdAt, id) and returns all when under the limit", () => {
    const rows = [makeRow("c", 3), makeRow("a", 1), makeRow("b", 2)];

    const page = paginateKeyset(rows, { limit: 20, cursor: null }, toPoint);

    expect(page.items.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(page.nextCursor).toBeNull();
  });

  it("returns limit items and a cursor when there are more", () => {
    const rows = [makeRow("a", 1), makeRow("b", 2), makeRow("c", 3)];

    const page = paginateKeyset(rows, { limit: 2, cursor: null }, toPoint);

    expect(page.items.map((item) => item.id)).toEqual(["a", "b"]);
    expect(page.nextCursor).toBe(encodeCursor({ createdAt: 2, id: "b" }));
  });

  it("returns only items after the cursor", () => {
    const rows = [makeRow("a", 1), makeRow("b", 2), makeRow("c", 3)];
    const cursor = encodeCursor({ createdAt: 2, id: "b" });

    const page = paginateKeyset(rows, { limit: 20, cursor }, toPoint);

    expect(page.items.map((item) => item.id)).toEqual(["c"]);
    expect(page.nextCursor).toBeNull();
  });

  it("sorts by id when createdAt ties", () => {
    const rows = [makeRow("d", 1), makeRow("a", 1)];

    const page = paginateKeyset(rows, { limit: 20, cursor: null }, toPoint);

    expect(page.items.map((item) => item.id)).toEqual(["a", "d"]);
  });

  it("does not mutate the input array", () => {
    const rows = [makeRow("b", 2), makeRow("a", 1)];

    paginateKeyset(rows, { limit: 20, cursor: null }, toPoint);

    expect(rows.map((item) => item.id)).toEqual(["b", "a"]);
  });
});
