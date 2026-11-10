import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it, vi } from "vitest";

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

describe("DataIntegrityError mapping", () => {
  it("answers a generic INTERNAL_SERVER_ERROR and logs field and value", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = router({
      broken: publicProcedure.query(() => {
        throw new DataIntegrityError("planId", "enterprise");
      }),
    });
    const caller = r.createCaller({ user: null });

    await expect(caller.broken()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
    expect(log).toHaveBeenCalledWith("Data integrity error", {
      field: "planId",
      value: "enterprise",
    });

    log.mockRestore();
  });
});
