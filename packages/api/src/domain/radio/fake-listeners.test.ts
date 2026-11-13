import {
  fakeListenerTarget,
  refreshFakeListeners,
} from "@aqui-suena/api/domain/radio/fake-listeners";
import { InMemoryListenSessionRepository } from "@aqui-suena/api/domain/radio/listen-session";
import { describe, expect, it } from "vitest";

const now = new Date("2026-11-13T12:00:00Z");

describe("fakeListenerTarget", () => {
  it("is stable inside the same time bucket and differs by station", () => {
    const first = fakeListenerTarget("aqui-suena-pop", now);
    const second = fakeListenerTarget("aqui-suena-pop", new Date(now.getTime() + 5_000));
    const other = fakeListenerTarget("aqui-suena-night", now);

    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(5);
    expect(first).toBeLessThanOrEqual(120);
    expect(other).not.toBe(first);
  });

  it("moves smoothly between adjacent buckets", () => {
    const first = fakeListenerTarget("aqui-suena-pop", now);
    const next = fakeListenerTarget("aqui-suena-pop", new Date(now.getTime() + 30_000));

    expect(Math.abs(next - first)).toBeLessThanOrEqual(8);
  });
});

describe("refreshFakeListeners", () => {
  it("writes an active session and reads the count back through the repository", async () => {
    const sessions = new InMemoryListenSessionRepository();

    const listeners = await refreshFakeListeners(sessions, "aqui-suena-pop", now);

    expect(listeners).toBe(fakeListenerTarget("aqui-suena-pop", now));
    expect(await sessions.activeListeners("aqui-suena-pop", new Date(now.getTime() - 60_000))).toBe(
      listeners,
    );
  });

  it("does not count a session older than the active window", async () => {
    const sessions = new InMemoryListenSessionRepository();
    await sessions.upsertActive({
      id: "old",
      stationId: "aqui-suena-pop",
      startedAt: new Date(now.getTime() - 120_000),
      listeners: 10,
    });

    expect(await sessions.activeListeners("aqui-suena-pop", new Date(now.getTime() - 60_000))).toBe(
      0,
    );
  });
});
