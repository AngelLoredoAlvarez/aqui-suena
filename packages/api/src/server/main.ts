import { InMemoryObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { createSubscriptionNotifier } from "@aqui-suena/api/server/composition/email";
import { readConfig } from "@aqui-suena/api/server/env";
import { createApiServer } from "@aqui-suena/api/server/server";

const config = readConfig(process.env);

const subscriptionNotifier = createSubscriptionNotifier(
  process.env.RESEND_API_KEY,
  process.env.RESEND_FROM,
);

// Local Node has no R2 credentials: use the in-memory adapter explicitly. This
// is the only entry point allowed to do so; the Worker never substitutes one.
const server = createApiServer({
  allowedOrigins: config.allowedOrigins,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY,
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  supabaseJwksUrl: process.env.SUPABASE_JWKS_URL,
  mediaStorage: new InMemoryObjectStorage(),
  subscriptionNotifier,
});

server.listen(config.port, config.host, () => {
  console.log(`api: listening on http://${config.host}:${config.port}`);
  console.log(`api: allowed origins: ${config.allowedOrigins.join(", ")}`);
});

// Deploy platforms stop a container with SIGTERM; finish in-flight requests
// instead of dropping a listener mid-stream.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.log(`api: ${signal} received, closing`);
    server.close(() => process.exit(0));
  });
}
