import { parse } from "valibot";
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
