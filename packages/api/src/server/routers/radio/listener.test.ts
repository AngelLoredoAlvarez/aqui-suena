import { HARNESS_STATIONS } from "@aqui-suena/api/domain/radio/harness";
import { InMemoryListenSessionRepository } from "@aqui-suena/api/domain/radio/listen-session";
import { InMemoryStationRepository } from "@aqui-suena/api/domain/radio/station";
import { createListenerRouter } from "@aqui-suena/api/server/routers/radio/listener";
import { describe, expect, it } from "vitest";

function makeCaller(fakeListeners = false) {
  const router = createListenerRouter(
    new InMemoryStationRepository([...HARNESS_STATIONS]),
    new InMemoryListenSessionRepository(),
    fakeListeners,
  );

  return router.createCaller({ user: null });
}

describe("listener.getStatus", () => {
  it("returns the station from the catalog with no listener source", async () => {
    const caller = makeCaller();

    const status = await caller.getStatus({ stationId: "test-pop" });

    expect(status.station).toEqual({ id: "test-pop", name: "Test Pop" });
    expect(status.activeUrl).toBe("http://localhost:3000/test-streams/test-pop.m4a");
    expect(status.listeners).toBe(0);
  });

  it("simulates listeners through the session repository when enabled", async () => {
    const caller = makeCaller(true);

    const status = await caller.getStatus({ stationId: "test-pop" });

    expect(status.listeners).toBeGreaterThan(0);
  });

  it("answers NOT_FOUND for an unknown station", async () => {
    const caller = makeCaller();

    await expect(caller.getStatus({ stationId: "missing" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects an empty station id", async () => {
    const caller = makeCaller();

    await expect(caller.getStatus({ stationId: "" })).rejects.toThrow();
  });
});
