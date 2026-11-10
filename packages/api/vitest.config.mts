import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const apiSrc = path.join(fileURLToPath(import.meta.url), "..", "src");

export default defineConfig({
  resolve: {
    // Prefix alias: `@aqui-suena/api/anything` resolves to `src/anything`.
    // Mirrors the tsconfig path wildcard, so module resolution has one shape
    // for tests and typecheck instead of a hand-maintained alias list.
    alias: { "@aqui-suena/api": apiSrc },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["src/testing/**", "**/*.test.ts"],
      // Baseline on 2026-11-10: statements 93.7, branches 82.69,
      // functions 96.1, lines 94.85. Thresholds sit ~2 points below so a
      // real regression fails without making small refactors brittle.
      thresholds: {
        statements: 92,
        branches: 80,
        functions: 94,
        lines: 93,
      },
    },
  },
});
