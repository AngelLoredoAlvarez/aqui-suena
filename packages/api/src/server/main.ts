import { InMemoryObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { createR2StorageFromEnv } from "@aqui-suena/api/infrastructure/media/r2-from-env";
import { createSubscriptionNotifier } from "@aqui-suena/api/server/composition/email";
import { readConfig } from "@aqui-suena/api/server/env";
import { openLocalDatabase } from "@aqui-suena/api/server/local/local-database";
import { createApiServer } from "@aqui-suena/api/server/server";

async function main(): Promise<void> {
  const config = readConfig(process.env);
  const localD1Path = process.env.LOCAL_D1_PATH?.trim();
  const local = localD1Path ? await openLocalDatabase(localD1Path) : undefined;
  const r2Storage = createR2StorageFromEnv(process.env);
  const mediaStorage = r2Storage ?? new InMemoryObjectStorage();

  const subscriptionNotifier = createSubscriptionNotifier({
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM,
    appUrl: process.env.EMAIL_APP_URL,
    supportEmail: process.env.EMAIL_SUPPORT_ADDRESS,
  });

  const server = createApiServer({
    allowedOrigins: config.allowedOrigins,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
    supabaseJwksUrl: process.env.SUPABASE_JWKS_URL,
    directoryRepositories: local?.repositories,
    mediaStorage,
    subscriptionNotifier,
  });

  server.listen(config.port, config.host, () => {
    console.log(`api: listening on http://${config.host}:${config.port}`);

    if (local === undefined) {
      console.log("api: in-memory repositories (set LOCAL_D1_PATH for local D1)");
    } else {
      console.log(
        `api: local D1 at ${localD1Path} (${local.appliedMigrations.length} migration(s) applied)`,
      );
    }

    console.log(
      r2Storage === undefined
        ? "api: media storage in-memory (R2 credentials are incomplete or absent)"
        : `api: media storage R2 (${process.env.R2_BUCKET_NAME?.trim() || "aqui-suena-media"})`,
    );
    console.log(`api: allowed origins: ${config.allowedOrigins.join(", ")}`);
  });

  // Deploy platforms stop a container with SIGTERM; finish in-flight requests
  // instead of dropping a listener mid-stream.
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      console.log(`api: ${signal} received, closing`);
      server.close(() => {
        local?.close();
        process.exit(0);
      });
    });
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
