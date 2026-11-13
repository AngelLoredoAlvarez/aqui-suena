import { HARNESS_STATIONS } from "@aqui-suena/api/domain/radio/harness";
import {
  InMemoryListenSessionRepository,
  type ListenSessionRepository,
} from "@aqui-suena/api/domain/radio/listen-session";
import { InMemoryStationRepository } from "@aqui-suena/api/domain/radio/station";
import { createListenerRouter } from "@aqui-suena/api/server/routers/radio/listener";
import { describe, expect, it } from "vitest";

function makeCaller(sessions: ListenSessionRepository = new InMemoryListenSessionRepository()) {
  const router = createListenerRouter(
    new InMemoryStationRepository([...HARNESS_STATIONS]),
    sessions,
  );

  return router.createCaller({ user: null });
}

describe("listener.getStatus", () => {
  it("returns the station from the catalog with no active sessions", async () => {
    const caller = makeCaller();

    const status = await caller.getStatus({ stationId: "aqui-suena-pop" });

    expect(status.station).toEqual({ id: "aqui-suena-pop", name: "Aquí Suena Pop" });
    expect(status.activeUrl).toBe("http://localhost:3000/test-streams/aqui-suena-pop.m4a");
    expect(status.listeners).toBe(0);
  });

  it("counts active sessions through the repository", async () => {
    const sessions = new InMemoryListenSessionRepository();
    await sessions.upsertActive({
      id: "live:test-session",
      stationId: "aqui-suena-pop",
      startedAt: new Date(),
      listeners: 1,
    });
    const caller = makeCaller(sessions);

    const status = await caller.getStatus({ stationId: "aqui-suena-pop" });

    expect(status.listeners).toBe(1);
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
