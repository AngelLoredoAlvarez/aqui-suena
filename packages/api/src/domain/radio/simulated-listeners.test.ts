import { simulatedListenerCount } from "@aqui-suena/api/domain/radio/simulated-listeners";
import { describe, expect, it } from "vitest";

const now = new Date("2026-11-13T12:00:00Z");

describe("simulatedListenerCount", () => {
  it("is stable inside the same time bucket and differs by station", () => {
    const first = simulatedListenerCount("aqui-suena-pop", now);
    const second = simulatedListenerCount("aqui-suena-pop", new Date(now.getTime() + 5_000));
    const other = simulatedListenerCount("aqui-suena-night", now);

    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(5);
    expect(first).toBeLessThanOrEqual(120);
    expect(other).not.toBe(first);
  });

  it("moves smoothly between adjacent buckets", () => {
    const first = simulatedListenerCount("aqui-suena-pop", now);
    const next = simulatedListenerCount("aqui-suena-pop", new Date(now.getTime() + 30_000));

    expect(Math.abs(next - first)).toBeLessThanOrEqual(8);
  });
});
