import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const mobileRoot = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@aqui-suena/mobile": mobileRoot },
  },
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["components/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // app/_layout.tsx and app/index.tsx are Expo Router entrypoints,
      // render-tested with @testing-library/react over mocks for react-native,
      // expo-router, expo-* and @aqui-suena/ui (see test/setup.ts and the
      // app/*.test.tsx files). The uncovered branches are the fonts-not-loaded
      // and persisted-value-present paths, which need per-test mock overrides.
      // PlayerLanding and its behavior live in @aqui-suena/ui (covered there).
      include: ["components/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}"],
      // Baseline on 2026-11-26: statements 93.61, branches 80.95,
      // functions 92.68, lines 93.38. Thresholds sit ~2 points below.
      thresholds: {
        statements: 91,
        branches: 78,
        functions: 90,
        lines: 91,
      },
    },
  },
});
