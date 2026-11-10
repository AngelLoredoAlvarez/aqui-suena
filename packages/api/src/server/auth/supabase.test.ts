import { describe, expect, it } from "vitest";

import { createSupabaseClient } from "./supabase";

describe("createSupabaseClient", () => {
  it("returns null when the url is missing", () => {
    expect(createSupabaseClient(undefined, "anon-key")).toBeNull();
  });

  it("returns null when the anon key is missing", () => {
    expect(createSupabaseClient("https://example.supabase.co", undefined)).toBeNull();
  });

  it("builds a client when both are present", () => {
    expect(createSupabaseClient("https://example.supabase.co", "anon-key")).not.toBeNull();
  });
});
