import { defineConfig } from "drizzle-kit";

// Live push needs a dev database: set DATABASE_URL, then run
// `pnpm --filter db db:push`. Not exercised in mock-first Task 3.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
