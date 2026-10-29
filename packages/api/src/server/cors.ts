// Origin policy for the three clients. CORS is a browser mechanism, not an
// authentication boundary: a missing Origin is allowed because React Native
// sends none, while an explicit unknown Origin is refused.

// Web dev server, plus both Tauri custom-protocol origins: `tauri://localhost`
// on Linux and macOS, `http://tauri.localhost` on Windows.
export const DEFAULT_ALLOWED_ORIGINS: readonly string[] = [
  "http://localhost:3000",
  "tauri://localhost",
  "http://tauri.localhost",
];

export interface CorsDecision {
  allowed: boolean;
  origin: string | null;
}

export function resolveCors(
  origin: string | null,
  allowedOrigins: readonly string[],
): CorsDecision {
  if (origin === null) {
    return { allowed: true, origin: null };
  }

  return { allowed: allowedOrigins.includes(origin), origin };
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { vary: "Origin" };
  if (origin === null) {
    return headers;
  }

  headers["access-control-allow-origin"] = origin;
  headers["access-control-allow-methods"] = "GET,POST,OPTIONS";
  headers["access-control-allow-headers"] = "content-type,authorization";
  return headers;
}

export function preflightHeaders(origin: string): Record<string, string> {
  return { ...corsHeaders(origin), "access-control-max-age": "600" };
}
