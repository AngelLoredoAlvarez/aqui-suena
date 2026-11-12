import type { CursorPoint } from "@aqui-suena/api/shared/pagination/cursor";
import { decodeCursor, encodeCursor } from "@aqui-suena/api/shared/pagination/cursor";
import { describe, expect, it } from "vitest";

describe("cursor codec", () => {
  it("round-trips a cursor point", () => {
    const point: CursorPoint = { createdAt: 1_700_000_000, id: "business-1" };

    expect(decodeCursor(encodeCursor(point))).toEqual(point);
  });

  it("round-trips an id with special characters", () => {
    const point: CursorPoint = {
      createdAt: 0,
      id: "8f1c2d3e-4b5a-6f7d-8e9f-0a1b2c3d4e5f",
    };

    expect(decodeCursor(encodeCursor(point))).toEqual(point);
  });

  it("is deterministic", () => {
    const point: CursorPoint = { createdAt: 1_700_000_000, id: "business-1" };

    expect(encodeCursor(point)).toBe(encodeCursor(point));
  });

  it("is opaque: the encoded string does not reveal the raw values", () => {
    const point: CursorPoint = { createdAt: 1_700_000_000, id: "business-1" };
    const encoded = encodeCursor(point);

    expect(encoded).not.toContain("business-1");
    expect(encoded).not.toContain("1700000000");
  });

  it.each(["", "!!!", "not-base64", "   "])("rejects the invalid string %s", (input) => {
    expect(decodeCursor(input)).toBeNull();
  });

  it("rejects base64 that is not JSON", () => {
    expect(decodeCursor(btoa("hello world"))).toBeNull();
  });

  it("rejects JSON that is not a two-element array", () => {
    expect(decodeCursor(btoa(JSON.stringify("hello")))).toBeNull();
    expect(decodeCursor(btoa(JSON.stringify({ createdAt: 1, id: "x" })))).toBeNull();
    expect(decodeCursor(btoa(JSON.stringify([1])))).toBeNull();
    expect(decodeCursor(btoa(JSON.stringify([1, "x", "extra"])))).toBeNull();
  });

  it("rejects a non-integer createdAt", () => {
    expect(decodeCursor(btoa(JSON.stringify([1.5, "x"])))).toBeNull();
    expect(decodeCursor(btoa(JSON.stringify(["1", "x"])))).toBeNull();
    expect(decodeCursor(btoa(JSON.stringify([null, "x"])))).toBeNull();
  });

  it("rejects a missing or non-string id", () => {
    expect(decodeCursor(btoa(JSON.stringify([1, ""])))).toBeNull();
    expect(decodeCursor(btoa(JSON.stringify([1, 123])))).toBeNull();
    expect(decodeCursor(btoa(JSON.stringify([1])))).toBeNull();
  });
});
