import { createSupabaseClient } from "@aqui-suena/api/server/auth/supabase";
import type { Context } from "@aqui-suena/api/server/trpc/trpc";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function createContext(
  req: Request,
  supabase: SupabaseClient | null,
): Promise<Context> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token || !supabase) {
    return { user: null };
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { user: null };
  }

  const accountId = (data.user.app_metadata?.account_id as string | undefined) ?? data.user.id;

  return { user: { id: data.user.id, accountId } };
}

// Factory for production: builds the Supabase client from env vars.
export function createSupabaseFromEnv(
  url: string | undefined,
  anonKey: string | undefined,
): SupabaseClient | null {
  return createSupabaseClient(url, anonKey);
}
