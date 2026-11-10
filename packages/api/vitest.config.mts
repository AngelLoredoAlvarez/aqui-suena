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
  },
});
