import { appRouter } from "@aqui-suena/api/router";
import { describe, expect, it } from "vitest";

const caller = appRouter.createCaller({});

describe("listener.getStatus", () => {
  it("returns the mocked status shape for a station", async () => {
    const status = await caller.listener.getStatus({
      stationId: "placeholder-station",
    });

    expect(status.station.id).toBe("placeholder-station");
    expect(status.station.name).toBe("Aquí Suena");
    expect(typeof status.activeUrl).toBe("string");
    expect(status.listeners).toBeGreaterThanOrEqual(0);
  });

  it("rejects an empty station id", async () => {
    await expect(caller.listener.getStatus({ stationId: "" })).rejects.toThrow();
  });
});
