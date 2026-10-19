import { describe, expect, it } from "vitest";

import { listenerStatusOutput } from "./listener";

// Pins the zod 3 -> 4 migration contract. The URL check moved from the
// deprecated `z.string().url()` to `z.url()`; both accept and reject the same
// inputs, but zod 4 trims surrounding whitespace from the parsed value.
const ACCEPT = [
  "http://example.com",
  "https://example.com",
  "ftp://example.com",
  "mailto:foo@example.com",
  "https://münchen.de",
  "http://192.168.0.1:8080/path",
  "http://localhost:3000",
];
const REJECT = ["", "not-a-url", "//example.com", "https://", "https://exa mple.com"];
const payload = {
  station: { id: "station-1", name: "Aqui Suena" },
  listeners: 42,
};

describe("listenerStatusOutput url contract", () => {
  it.each(ACCEPT)("accepts %s", (activeUrl) => {
    expect(listenerStatusOutput.safeParse({ ...payload, activeUrl }).success).toBe(true);
  });

  it.each(REJECT)("rejects %j", (activeUrl) => {
    expect(listenerStatusOutput.safeParse({ ...payload, activeUrl }).success).toBe(false);
  });

  it("trims surrounding whitespace from the parsed url", () => {
    const parsed = listenerStatusOutput.parse({
      ...payload,
      activeUrl: " https://example.com ",
    });

    expect(parsed.activeUrl).toBe("https://example.com");
  });

  it("rejects negative, fractional and non-finite listener counts", () => {
    for (const listeners of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        listenerStatusOutput.safeParse({
          ...payload,
          activeUrl: "https://example.com",
          listeners,
        }).success,
      ).toBe(false);
    }
  });
});
