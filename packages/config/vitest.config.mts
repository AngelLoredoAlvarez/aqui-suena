import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const configSrc = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@aqui-suena/config": configSrc,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["**/*.test.ts"],
      // Baseline on 2026-11-26: 100% across the board (data-only config).
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
