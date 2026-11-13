import { encodeCursor } from "@aqui-suena/api/shared/pagination/cursor";
import {
  cursorInputSchema,
  offsetInputSchema,
  paginationLimitSchema,
} from "@aqui-suena/api/shared/pagination/input";
import { parse } from "valibot";
import { describe, expect, it } from "vitest";

describe("paginationLimitSchema", () => {
  it.each([1, 50, 100])("accepts the limit %s", (limit) => {
    expect(parse(paginationLimitSchema, limit)).toBe(limit);
  });

  it.each([0, -1, 101, 1.5, "20", null])("rejects the invalid limit %s", (limit) => {
    expect(() => parse(paginationLimitSchema, limit)).toThrow();
  });
});

describe("offsetInputSchema", () => {
  it("defaults limit to 20 and offset to 0", () => {
    expect(parse(offsetInputSchema, {})).toEqual({ limit: 20, offset: 0 });
  });

  it("accepts an explicit limit and offset", () => {
    expect(parse(offsetInputSchema, { limit: 50, offset: 10 })).toEqual({
      limit: 50,
      offset: 10,
    });
  });

  it.each([0, -1, 101, 1.5])("rejects the invalid limit %s", (limit) => {
    expect(() => parse(offsetInputSchema, { limit })).toThrow();
  });

  it.each([-1, 1.5, "0"])("rejects the invalid offset %s", (offset) => {
    expect(() => parse(offsetInputSchema, { offset })).toThrow();
  });
});

describe("cursorInputSchema", () => {
  it("defaults limit to 20", () => {
    expect(parse(cursorInputSchema, {})).toEqual({ limit: 20 });
  });

  it("accepts a valid cursor", () => {
    const cursor = encodeCursor({ createdAt: 1_700_000_000, id: "business-1" });

    expect(parse(cursorInputSchema, { cursor })).toEqual({ limit: 20, cursor });
  });

  it("rejects an invalid cursor", () => {
    expect(() => parse(cursorInputSchema, { cursor: "!!!" })).toThrow();
  });
});
