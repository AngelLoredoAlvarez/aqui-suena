import { HARNESS_STATIONS } from "@aqui-suena/api/domain/radio/harness";
import { InMemoryStationRepository } from "@aqui-suena/api/domain/radio/station";
import { createListenerRouter } from "@aqui-suena/api/server/routers/radio/listener";
import { describe, expect, it } from "vitest";

function makeCaller() {
  const router = createListenerRouter(new InMemoryStationRepository([...HARNESS_STATIONS]));

  return router.createCaller({ user: null });
}

describe("listener.getStatus", () => {
  it("returns the station from the catalog with a simulated count", async () => {
    const caller = makeCaller();

    const status = await caller.getStatus({ stationId: "aqui-suena-pop" });

    expect(status.station).toEqual({ id: "aqui-suena-pop", name: "Aquí Suena Pop" });
    expect(status.activeUrl).toBe("http://localhost:3000/test-streams/aqui-suena-pop.m4a");
    expect(status.listeners).toBeGreaterThanOrEqual(5);
    expect(status.listeners).toBeLessThanOrEqual(120);
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
