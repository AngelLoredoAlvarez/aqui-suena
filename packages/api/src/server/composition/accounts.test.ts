import { InMemoryObjectStorage } from "@aqui-suena/api/infrastructure/memory/media/in-memory-object-storage";
import { createDeleteAccount } from "@aqui-suena/api/server/composition/accounts";
import { createInMemoryRepositories } from "@aqui-suena/api/server/composition/repositories";
import { describe, expect, it } from "vitest";

const repositories = createInMemoryRepositories();
const storage = new InMemoryObjectStorage();

describe("createDeleteAccount", () => {
  it("returns undefined without storage", () => {
    expect(
      createDeleteAccount({
        repositories,
        supabaseUrl: "https://example.supabase.co",
        supabaseSecretKey: "secret",
      }),
    ).toBeUndefined();
  });

  it("returns undefined without a Supabase url or secret", () => {
    expect(createDeleteAccount({ repositories, storage })).toBeUndefined();
    expect(
      createDeleteAccount({
        repositories,
        storage,
        supabaseUrl: "https://example.supabase.co",
      }),
    ).toBeUndefined();
    expect(
      createDeleteAccount({ repositories, storage, supabaseSecretKey: "secret" }),
    ).toBeUndefined();
  });

  it("returns a wired deleter when storage and Supabase are configured", () => {
    const deleter = createDeleteAccount({
      repositories,
      storage,
      supabaseUrl: "https://example.supabase.co",
      supabaseSecretKey: "secret",
    });

    expect(deleter).toBeDefined();
    expect(typeof deleter?.execute).toBe("function");
  });
});
