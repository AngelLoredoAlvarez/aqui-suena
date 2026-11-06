import { readConfig } from "./env";
import { createApiServer } from "./server";

const config = readConfig(process.env);
const server = createApiServer({
  allowedOrigins: config.allowedOrigins,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
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
