import { DEFAULT_ALLOWED_ORIGINS } from "./cors";

const DEFAULT_PORT = 3001;
// Listen on every interface: deploy platforms (Fly, Render, Dokku) reach the
// process through the container network, not through loopback.
const DEFAULT_HOST = "0.0.0.0";

export interface ApiConfig {
  port: number;
  host: string;
  allowedOrigins: readonly string[];
}

// Extra origins come from the environment so a production web domain needs no
// code change. An absent or empty variable keeps the platform defaults.
export function parseAllowedOrigins(raw: string | undefined): readonly string[] {
  if (raw === undefined) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return origins.length === 0 ? DEFAULT_ALLOWED_ORIGINS : [...new Set(origins)];
}

export function readConfig(env: NodeJS.ProcessEnv): ApiConfig {
  const rawPort = env.PORT;
  const port = rawPort === undefined || rawPort === "" ? DEFAULT_PORT : Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535, received "${rawPort}"`);
  }

  const host = env.HOST ?? "";

  return {
    port,
    host: host.length > 0 ? host : DEFAULT_HOST,
    allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
  };
}
