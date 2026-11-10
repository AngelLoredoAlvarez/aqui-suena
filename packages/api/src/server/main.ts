import { readConfig } from "@aqui-suena/api/server/env";
import { createApiServer } from "@aqui-suena/api/server/server";

const config = readConfig(process.env);
const server = createApiServer({
  allowedOrigins: config.allowedOrigins,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY,
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  supabaseJwksUrl: process.env.SUPABASE_JWKS_URL,
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
