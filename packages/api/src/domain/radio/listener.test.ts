import { parse, safeParse } from "valibot";
import { describe, expect, it } from "vitest";

import { listenerStatusOutput } from "./listener";

// Pins the output contract across the zod -> valibot migration. The URL check
// moved from `z.string().url()` / `z.url()` to valibot's `v.url()` (checked
// with the WHATWG URL parser); both forms accept and reject the same inputs,
// and this suite keeps that behaviour from drifting silently.
const validStatus = {
  station: { id: "station-1", name: "Aquí Suena" },
  activeUrl: "https://stream.example.com/live",
  listeners: 42,
};

describe("listenerStatusOutput", () => {
  it("accepts a valid listener status payload", () => {
    expect(parse(listenerStatusOutput, validStatus)).toEqual(validStatus);
  });

  it("rejects an activeUrl that is not a URL", () => {
    expect(() => parse(listenerStatusOutput, { ...validStatus, activeUrl: "not-a-url" })).toThrow();
  });
});

describe("listenerStatusOutput url contract", () => {
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
