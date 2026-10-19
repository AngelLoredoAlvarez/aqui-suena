import { describe, expect, it } from "vitest";

import { listenerStatusOutput } from "./listener";

// Pins the output contract across the zod 3 -> 4 migration. The URL check
// moved from the deprecated `z.string().url()` to `z.url()`; both forms were
// verified to accept and reject the same inputs, and this suite keeps that
// behaviour from drifting silently.
const validStatus = {
  station: { id: "station-1", name: "Aqui Suena" },
  activeUrl: "https://stream.example.com/live",
  listeners: 42,
};

describe("listenerStatusOutput", () => {
  it("accepts a valid listener status payload", () => {
    expect(listenerStatusOutput.parse(validStatus)).toEqual(validStatus);
  });

  it("rejects an activeUrl that is not a URL", () => {
    expect(() => listenerStatusOutput.parse({ ...validStatus, activeUrl: "not-a-url" })).toThrow();
  });
});
