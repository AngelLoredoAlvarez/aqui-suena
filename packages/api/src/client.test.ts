import { describe, expect, it, vi } from "vitest";

// The client entry must NEVER pull @trpc/server into its module graph:
// shared UI runs in browsers and React Native, where initTRPC.create()
// throws "non-server environment". If anyone adds a server import to the
// client entry later, this mock makes the suite fail.
vi.mock("@trpc/server", () => {
  throw new Error("@trpc/server must never load in the client entry");
});

describe("client entry (non-server safe)", () => {
  it("loads and serves status without the server module", async () => {
    const { getListenerStatus } = await import("./client");
    const status = await getListenerStatus("placeholder-station");

    expect(status.station.id).toBe("placeholder-station");
    expect(status.listeners).toBeGreaterThanOrEqual(0);
  });
});
