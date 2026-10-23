import { defineConfig } from "drizzle-kit";

// Live push targets Cloudflare D1 (SQLite) through the HTTP driver. No local
// database is exercised in mock-first mode; set the three CLOUDFLARE_* vars
// and run `pnpm --filter @aqui-suena/db db:push` against a real D1 database.
export default defineConfig({
  dialect: "sqlite",
  driver: "d1-http",
  schema: "./src/schema.ts",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
    databaseId: process.env.CLOUDFLARE_DATABASE_ID ?? "",
    token: process.env.CLOUDFLARE_D1_TOKEN ?? "",
  },
});
