import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const playerSrc = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@aqui-suena/player": playerSrc,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["**/*.test.{ts,tsx}"],
      // Baseline on 2026-11-26: statements 99.41, branches 95,
      // functions 100, lines 99.4. Thresholds sit ~2 points below.
      thresholds: {
        statements: 97,
        branches: 93,
        functions: 98,
        lines: 97,
      },
    },
  },
});
