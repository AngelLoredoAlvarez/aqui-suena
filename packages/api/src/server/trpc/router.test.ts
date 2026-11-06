import { appRouter } from "@aqui-suena/api/server/trpc/router";
import { describe, expect, it } from "vitest";

describe("appRouter ads.carousel", () => {
  it("exposes ads.carousel and returns an array", async () => {
    const caller = appRouter.createCaller({ user: null });
    const result = await caller.ads.carousel();

    expect(Array.isArray(result)).toBe(true);
  });

  it("returns an empty carousel for default (empty) repositories", async () => {
    const caller = appRouter.createCaller({ user: null });
    const result = await caller.ads.carousel();

    expect(result).toEqual([]);
  });
});
