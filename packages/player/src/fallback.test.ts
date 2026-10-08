import { describe, expect, it } from "vitest";

import { pickFallbackUrl } from "./fallback";

// Slice (a): mirror fallback picker. Contract under test:
// return the first candidate URL that was not tried yet,
// or null when every candidate was tried (or there are none).
describe("pickFallbackUrl", () => {
  it("returns the first candidate when nothing was tried", () => {
    const candidates = ["https://ice1.example/live", "https://ice2.example/live"];

    expect(pickFallbackUrl([], candidates)).toBe("https://ice1.example/live");
  });

  it("skips urls that were already tried", () => {
    const candidates = ["https://ice1.example/live", "https://ice2.example/live"];

    expect(pickFallbackUrl(["https://ice1.example/live"], candidates)).toBe(
      "https://ice2.example/live",
    );
  });

  it("returns null when every candidate was tried", () => {
    expect(
      pickFallbackUrl(["https://ice1.example/live"], ["https://ice1.example/live"]),
    ).toBeNull();
  });

  it("returns null when there are no candidates", () => {
    expect(pickFallbackUrl([], [])).toBeNull();
  });
});
