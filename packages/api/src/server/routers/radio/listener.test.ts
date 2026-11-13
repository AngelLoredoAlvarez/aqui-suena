import { listenerRouter } from "@aqui-suena/api/server/routers/radio/listener";
import { describe, expect, it } from "vitest";

const caller = listenerRouter.createCaller({ user: null });

describe("listener.getStatus", () => {
  it("returns the mocked status shape for a station", async () => {
    const status = await caller.getStatus({
      stationId: "placeholder-station",
    });

    expect(status.station.id).toBe("placeholder-station");
    expect(status.station.name).toBe("Aquí Suena");
    expect(typeof status.activeUrl).toBe("string");
    expect(status.listeners).toBeGreaterThanOrEqual(0);
  });

  it("rejects an empty station id", async () => {
    await expect(caller.getStatus({ stationId: "" })).rejects.toThrow();
  });
});
