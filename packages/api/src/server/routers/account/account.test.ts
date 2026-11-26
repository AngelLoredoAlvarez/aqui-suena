import { InMemoryAccountRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-account-repository";
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

describe("account preferences", () => {
  const account = {
    id: "acc-1",
    email: "owner@example.com",
    planId: "trades" as const,
    locale: "es-MX" as const,
  };

  it("returns the default when the preference is not stored", async () => {
    const router = createAccountRouter({
      account: new InMemoryAccountRepository([account]),
      deleteAccount: undefined,
    });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    await expect(caller.getPreferences()).resolves.toEqual({
      renewalRemindersEnabled: true,
    });
  });

  it("updates the renewal reminder preference", async () => {
    const router = createAccountRouter({
      account: new InMemoryAccountRepository([account]),
      deleteAccount: undefined,
    });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    await expect(caller.updatePreferences({ renewalRemindersEnabled: false })).resolves.toEqual({
      renewalRemindersEnabled: false,
    });
    await expect(caller.getPreferences()).resolves.toEqual({
      renewalRemindersEnabled: false,
    });
  });

  it("refuses when the preference store is not configured", async () => {
    const router = createAccountRouter({ deleteAccount: undefined });
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    await expect(caller.getPreferences()).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });
});
