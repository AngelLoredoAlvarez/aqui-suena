import { describe, expect, it } from "vitest";

import { appRouter } from "../router";

const caller = appRouter.createCaller({});

describe("listener.getStatus", () => {
  it("returns the mocked status shape for a station", async () => {
    const status = await caller.listener.getStatus({
      stationId: "placeholder-station",
    });

    expect(status.station.id).toBe("placeholder-station");
    expect(status.station.name).toBe("Aqui Suena");
    expect(typeof status.activeUrl).toBe("string");
    expect(status.listeners).toBeGreaterThanOrEqual(0);
  });

  it("rejects an empty station id", async () => {
    await expect(caller.listener.getStatus({ stationId: "" })).rejects.toThrow();
  });
});
