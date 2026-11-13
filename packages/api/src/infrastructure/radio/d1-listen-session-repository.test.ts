import { D1ListenSessionRepository } from "@aqui-suena/api/infrastructure/radio/d1-listen-session-repository";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

describe("D1ListenSessionRepository", () => {
  it("sums active listeners inside the window", async () => {
    const fake = new FakeD1Database(() => ({ first: { total: 27 } }));
    const repository = new D1ListenSessionRepository(fake.db);

    const total = await repository.activeListeners("test-pop", new Date("2026-11-13T12:00:00Z"));

    expect(total).toBe(27);
    expect(fake.statements[0]?.sql).toMatch(/SUM\(listeners\)/);
    expect(fake.statements[0]?.sql).toMatch(/ended_at IS NULL AND started_at > \?/);
    expect(fake.statements[0]?.params).toEqual(["test-pop", expect.any(Number)]);
  });

  it("returns 0 when the query returns no row", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repository = new D1ListenSessionRepository(fake.db);

    expect(await repository.activeListeners("test-pop", new Date())).toBe(0);
  });

  it("upserts an active session idempotently", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repository = new D1ListenSessionRepository(fake.db);

    await repository.upsertActive({
      id: "fake-test-pop",
      stationId: "test-pop",
      startedAt: new Date("2026-11-13T12:00:00Z"),
      listeners: 42,
    });

    expect(fake.statements[0]?.sql).toContain("ON CONFLICT(id) DO UPDATE");
    expect(fake.statements[0]?.params).toEqual([
      "fake-test-pop",
      "test-pop",
      expect.any(Number),
      42,
    ]);
  });
});
