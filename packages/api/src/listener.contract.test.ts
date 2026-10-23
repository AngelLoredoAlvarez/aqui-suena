import { parse, safeParse } from "valibot";
import { describe, expect, it } from "vitest";

import { listenerStatusOutput } from "./listener";

// Pins the zod -> valibot migration contract. The URL check moved from
// `z.url()` to valibot's `v.pipe(v.string(), v.trim(), v.url())`; both accept
// and reject the same inputs, and valibot trims surrounding whitespace like
// zod 4 did before validating.
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
  station: { id: "station-1", name: "Aquí Suena" },
  listeners: 42,
};

describe("listenerStatusOutput url contract", () => {
  it.each(ACCEPT)("accepts %s", (activeUrl) => {
    expect(safeParse(listenerStatusOutput, { ...payload, activeUrl }).success).toBe(true);
  });

  it.each(REJECT)("rejects %j", (activeUrl) => {
    expect(safeParse(listenerStatusOutput, { ...payload, activeUrl }).success).toBe(false);
  });

  it("trims surrounding whitespace from the parsed url", () => {
    const parsed = parse(listenerStatusOutput, {
      ...payload,
      activeUrl: " https://example.com ",
    });

    expect(parsed.activeUrl).toBe("https://example.com");
  });

  it("rejects negative, fractional and non-finite listener counts", () => {
    for (const listeners of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        safeParse(listenerStatusOutput, {
          ...payload,
          activeUrl: "https://example.com",
          listeners,
        }).success,
      ).toBe(false);
    }
  });
});
