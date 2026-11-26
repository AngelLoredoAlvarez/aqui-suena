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
      // tray-runtime.ts is covered, tray-bridge.ts is the Tauri event wiring and
      // is still untested (follow-up). The node-only environment does not render
      // React components, and rolldown cannot parse uncovered .tsx files, so the
      // .tsx entrypoints are deliberately out of scope.
      include: ["app/**/*.ts"],
      exclude: ["**/*.test.ts"],
      // Baseline on 2026-11-26: statements 25, branches 66.66,
      // functions 14.28, lines 31.57. Thresholds sit ~2 points below.
      thresholds: {
        statements: 23,
        branches: 64,
        functions: 12,
        lines: 29,
      },
    },
  },
});
