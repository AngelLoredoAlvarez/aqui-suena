import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase Auth client factory (T4 stack). The factory is env-agnostic so each
// platform supplies its own pair: the server reads SUPABASE_URL/ANON_KEY,
// web bakes NEXT_PUBLIC_SUPABASE_*, native bakes EXPO_PUBLIC_SUPABASE_*.
//
// Returns null until both are configured, so the app boots and tests run
// without a Supabase project. Full auth flows (SSR session refresh, native
// storage adapter, sign-in/sign-up) land with the owner-portal module; this
// is the shared, null-safe seam they build on.
export function createSupabaseClient(
  url: string | undefined,
  anonKey: string | undefined,
): SupabaseClient | null {
  if (!url || !anonKey) {
    return null;
  }
  return createClient(url, anonKey);
}
