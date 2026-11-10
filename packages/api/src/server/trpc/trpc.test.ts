import { protectedProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { describe, expect, it } from "vitest";

describe("protectedProcedure", () => {
  it("throws UNAUTHORIZED when no user in context", async () => {
    const r = router({ ping: protectedProcedure.query(() => "pong") });

    const caller = r.createCaller({ user: null });

    await expect(caller.ping()).rejects.toThrow(/UNAUTHORIZED/);
  });

  it("allows access when user is present", async () => {
    const r = router({ ping: protectedProcedure.query(() => "pong") });

    const caller = r.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.ping()).toBe("pong");
  });
});
