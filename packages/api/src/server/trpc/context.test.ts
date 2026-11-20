import {
  AccountEmailConflictError,
  InMemoryAccountRepository,
} from "@aqui-suena/api/domain/accounts/account-repository";
import { createContext } from "@aqui-suena/api/server/trpc/context";
import { describe, expect, it, vi } from "vitest";

type MockSupabase = import("@supabase/supabase-js").SupabaseClient;

function supabaseWith(user: unknown): MockSupabase {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
  } as unknown as MockSupabase;
}

function rejectingSupabase(): MockSupabase {
  return {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: null }, error: new Error("invalid token") }),
    },
  } as unknown as MockSupabase;
}

function requestWith(authorization?: string): Request {
  return new Request("http://localhost/trpc", {
    ...(authorization === undefined ? {} : { headers: { authorization } }),
  });
}

describe("createContext", () => {
  it("returns null user without provisioning when there is no Authorization header", async () => {
    const accounts = new InMemoryAccountRepository([]);

    const ctx = await createContext(requestWith(), null, accounts);

    expect(ctx.user).toBeNull();
    expect(await accounts.getById("u1")).toBeNull();
  });

  it("returns null user without provisioning when the token is invalid", async () => {
    const accounts = new InMemoryAccountRepository([]);

    const ctx = await createContext(requestWith("Bearer bad-token"), rejectingSupabase(), accounts);

    expect(ctx.user).toBeNull();
    expect(await accounts.getById("u1")).toBeNull();
  });

  it("provisions the account and returns the session user", async () => {
    const accounts = new InMemoryAccountRepository([]);

    const supabase = supabaseWith({ id: "u1", email: "Owner@Example.com" });

    const ctx = await createContext(requestWith("Bearer good-token"), supabase, accounts);

    expect(ctx.user).toEqual({ id: "u1", accountId: "u1" });
    expect(await accounts.getById("u1")).toEqual({
      id: "u1",
      email: "owner@example.com",
      planId: "community",
      locale: "es-MX",
      renewalRemindersEnabled: true,
    });
  });

  it("provisions under the app_metadata account id when the session carries one", async () => {
    const accounts = new InMemoryAccountRepository([]);

    const supabase = supabaseWith({
      id: "u1",
      email: "owner@example.com",
      app_metadata: { account_id: "acc-1" },
    });

    const ctx = await createContext(requestWith("Bearer good-token"), supabase, accounts);

    expect(ctx.user).toEqual({ id: "u1", accountId: "acc-1" });
    expect(await accounts.getById("acc-1")).not.toBeNull();
    expect(await accounts.getById("u1")).toBeNull();
  });

  it("rejects a session without an email and creates no account", async () => {
    const accounts = new InMemoryAccountRepository([]);

    const supabase = supabaseWith({ id: "u1" });

    await expect(
      createContext(requestWith("Bearer good-token"), supabase, accounts),
    ).rejects.toThrow(/email/i);

    expect(await accounts.getById("u1")).toBeNull();
  });

  it("propagates an email conflict without logging account ids", async () => {
    const accounts = new InMemoryAccountRepository([
      { id: "acc-old", email: "taken@example.com", planId: "community", locale: "es-MX" },
    ]);

    const supabase = supabaseWith({ id: "u1", email: "taken@example.com" });

    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      createContext(requestWith("Bearer good-token"), supabase, accounts),
    ).rejects.toBeInstanceOf(AccountEmailConflictError);

    expect(log).toHaveBeenCalledWith("account provisioning: email already owned");

    log.mockRestore();
  });
});
