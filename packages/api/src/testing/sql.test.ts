import { normalizeSql } from "@aqui-suena/api/testing/sql";
import { describe, expect, it } from "vitest";

describe("normalizeSql", () => {
  it("collapses newlines and indentation into single spaces", () => {
    const statement = `UPDATE accounts
      SET email = ?, rfc = NULL
      WHERE id = ?`;

    expect(normalizeSql(statement)).toBe("UPDATE accounts SET email = ?, rfc = NULL WHERE id = ?");
  });

  it("treats a missing statement as empty", () => {
    expect(normalizeSql(undefined)).toBe("");
  });
});
