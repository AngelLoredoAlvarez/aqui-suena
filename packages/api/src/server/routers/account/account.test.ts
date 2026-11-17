import { createAccountRouter } from "@aqui-suena/api/server/routers/account/account";
import { describe, expect, it, vi } from "vitest";

describe("account router", () => {
  it("deletes the caller's own account", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);

    const router = createAccountRouter({ deleteAccount: { execute } });

    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    await expect(caller.delete()).resolves.toEqual({ deleted: true });

    expect(execute).toHaveBeenCalledWith("acc-1");
  });

  it("refuses when no deletion path is configured", async () => {
    const router = createAccountRouter({ deleteAccount: undefined });

    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    await expect(caller.delete()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("requires an authenticated caller", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);

    const router = createAccountRouter({ deleteAccount: { execute } });

    const caller = router.createCaller({ user: null });

    await expect(caller.delete()).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    expect(execute).not.toHaveBeenCalled();
  });
});
