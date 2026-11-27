import {
  anonymizedAccountEmail,
  normalizeAccountEmail,
} from "@aqui-suena/api/domain/accounts/account";
import { describe, expect, it } from "vitest";

describe("normalizeAccountEmail", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeAccountEmail("  persona@example.com  ")).toBe("persona@example.com");
  });

  it("lowercases the whole address", () => {
    expect(normalizeAccountEmail("Persona@Example.COM")).toBe("persona@example.com");
  });

  it("combines trimming and lowercasing", () => {
    expect(normalizeAccountEmail("\t Facturas@Example.com \n")).toBe("facturas@example.com");
  });
});

describe("anonymizedAccountEmail", () => {
  it("derives a non-deliverable tombstone address from the id", () => {
    expect(anonymizedAccountEmail("acct_123")).toBe("deleted-acct_123@deleted.invalid");
  });

  it("produces a distinct address per id", () => {
    expect(anonymizedAccountEmail("acct_a")).not.toBe(anonymizedAccountEmail("acct_b"));
  });
});
