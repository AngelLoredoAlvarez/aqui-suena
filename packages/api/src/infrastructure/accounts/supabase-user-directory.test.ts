import { UserDeletionError } from "@aqui-suena/api/domain/accounts/user-directory";
import { SupabaseUserDirectory } from "@aqui-suena/api/infrastructure/accounts/supabase-user-directory";
import { describe, expect, it, vi } from "vitest";

function clientReturning(result: { error: unknown }) {
  return {
    auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ data: {}, ...result }) } },
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

describe("SupabaseUserDirectory", () => {
  it("deletes the user through the admin API", async () => {
    const client = clientReturning({ error: null });

    await new SupabaseUserDirectory(client).deleteUser("user-1");

    expect(client.auth.admin.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("treats an already-missing user as deleted", async () => {
    const client = clientReturning({ error: { status: 404, message: "User not found" } });

    await expect(new SupabaseUserDirectory(client).deleteUser("user-1")).resolves.toBeUndefined();
  });

  it("raises a typed error for any other failure", async () => {
    const client = clientReturning({ error: { status: 500, message: "boom" } });

    await expect(new SupabaseUserDirectory(client).deleteUser("user-1")).rejects.toBeInstanceOf(
      UserDeletionError,
    );
  });
});
