import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const webRoot = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@aqui-suena/web": webRoot },
  },
  test: {
    environment: "node",
    include: ["app/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // The web app is a thin shell. page.tsx, providers.tsx, layout.tsx and
      // boot-splash.tsx are Next.js entrypoints and presentational components
      // whose logic delegates to @aqui-suena/ui and @aqui-suena/player (covered
      // there at 86-100%). Coverage is scoped to the app-owned logic files (.ts):
      // tray-runtime.ts and tray-bridge.ts, both fully covered. The node-only
      // environment does not render React components, and rolldown cannot parse
      // uncovered .tsx files, so the .tsx entrypoints are deliberately out of scope.
      include: ["app/**/*.ts"],
      exclude: ["**/*.test.ts"],
      // Baseline on 2026-11-26: statements 100, branches 100,
      // functions 100, lines 100. Thresholds sit ~2 points below.
      thresholds: {
        statements: 98,
        branches: 96,
        functions: 98,
        lines: 98,
      },
    },
  },
});
