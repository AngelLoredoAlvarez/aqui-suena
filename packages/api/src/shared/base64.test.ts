import { toBase64 } from "@aqui-suena/api/shared/base64";
import { describe, expect, it } from "vitest";

describe("toBase64", () => {
  it("encodes the empty input to an empty string", () => {
    expect(toBase64(new Uint8Array())).toBe("");
  });

  it("encodes ASCII bytes", () => {
    expect(toBase64(new Uint8Array([104, 105]))).toBe("aGk=");
    expect(toBase64(new Uint8Array([102, 111, 111]))).toBe("Zm9v");
  });

  it("encodes bytes that require padding", () => {
    expect(toBase64(new Uint8Array([104, 101, 108, 108, 111]))).toBe("aGVsbG8=");
  });
});
