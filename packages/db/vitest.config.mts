import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dbSrc = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@aqui-suena/db": dbSrc,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["**/*.test.*", "tests/**"],
      // Baseline on 2026-11-26: statements 49.33, branches 100,
      // functions 33.33, lines 49.33. schema.ts is declarative Drizzle
      // code, so statement/function coverage is structurally low; the
      // schema.test.ts structural assertions and the migration-drift CI
      // check are the real guards. The threshold only catches gross drift.
      thresholds: {
        statements: 47,
        branches: 95,
        functions: 31,
        lines: 47,
      },
    },
  },
});
