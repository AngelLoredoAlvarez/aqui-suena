import { describe, expect, it, vi } from "vitest";
import { createContext } from "./context";

describe("createContext", () => {
  it("returns null user when no Authorization header", async () => {
    const ctx = await createContext(new Request("http://localhost/trpc"), null);

    expect(ctx.user).toBeNull();
  });

  it("returns null user when token is invalid", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("invalid token"),
        }),
      },
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const req = new Request("http://localhost/trpc", {
      headers: { authorization: "Bearer bad-token" },
    });

    const ctx = await createContext(req, mockSupabase);

    expect(ctx.user).toBeNull();
  });

  it("returns user when token is valid", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: "u1", app_metadata: { account_id: "acc-1" } },
          },
          error: null,
        }),
      },
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const req = new Request("http://localhost/trpc", {
      headers: { authorization: "Bearer good-token" },
    });

    const ctx = await createContext(req, mockSupabase);

    expect(ctx.user).toEqual({ id: "u1", accountId: "acc-1" });
  });
});
