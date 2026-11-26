import { paginateOffsetRows } from "@aqui-suena/api/shared/pagination/offset";
import { describe, expect, it } from "vitest";

type Row = { id: string; createdAt: number };

const toPoint = (row: Row) => ({ createdAt: row.createdAt, id: row.id });

describe("paginateOffsetRows", () => {
  it("sorts by cursor point and returns the first page", () => {
    const rows = [
      { id: "c", createdAt: 3 },
      { id: "a", createdAt: 1 },
      { id: "b", createdAt: 2 },
    ];

    expect(paginateOffsetRows(rows, { limit: 2, offset: 0 }, toPoint)).toEqual({
      items: [
        { id: "a", createdAt: 1 },
        { id: "b", createdAt: 2 },
      ],
      limit: 2,
      offset: 0,
      nextOffset: 2,
    });
  });

  it("applies the offset and drops nextOffset on the last page", () => {
    const rows = [
      { id: "c", createdAt: 3 },
      { id: "a", createdAt: 1 },
      { id: "b", createdAt: 2 },
    ];

    expect(paginateOffsetRows(rows, { limit: 2, offset: 2 }, toPoint)).toEqual({
      items: [{ id: "c", createdAt: 3 }],
      limit: 2,
      offset: 2,
      nextOffset: null,
    });
  });

  it("breaks timestamp ties by id", () => {
    const rows = [
      { id: "b", createdAt: 1 },
      { id: "a", createdAt: 1 },
    ];

    expect(paginateOffsetRows(rows, { limit: 2, offset: 0 }, toPoint).items).toEqual([
      { id: "a", createdAt: 1 },
      { id: "b", createdAt: 1 },
    ]);
  });
});
