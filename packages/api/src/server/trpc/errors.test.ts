import { idInput, requireFound } from "@aqui-suena/api/server/trpc/errors";
import { NotFoundError, ValidationError } from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it } from "vitest";

describe("idInput", () => {
  it("accepts an object carrying the id and returns it unwrapped", () => {
    expect(idInput("Thing id is required")({ id: "abc-1" })).toEqual({ id: "abc-1" });
  });

  it("ignores extra keys and keeps only the id", () => {
    expect(idInput("Thing id is required")({ id: "abc-1", extra: true })).toEqual({
      id: "abc-1",
    });
  });

  it("rejects the bare string form every procedure used to accept", () => {
    const parse = idInput("Thing id is required");

    expect(() => parse("abc-1")).toThrow(ValidationError);
    expect(() => parse("abc-1")).toThrow("Thing id is required");
  });

  it("rejects a missing, empty or non-string id", () => {
    const parse = idInput("Thing id is required");

    for (const value of [{}, { id: "" }, { id: 42 }, null, undefined]) {
      expect(() => parse(value)).toThrow(ValidationError);
    }
  });
});

describe("requireFound", () => {
  it("returns the value when present", () => {
    expect(requireFound({ id: "abc-1" }, "Thing not found")).toEqual({ id: "abc-1" });
  });

  it("raises NotFoundError with the caller's message when null", () => {
    expect(() => requireFound(null, "Thing not found")).toThrow(NotFoundError);
    expect(() => requireFound(null, "Thing not found")).toThrow("Thing not found");
  });
});
