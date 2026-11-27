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
    // Tests must live outside app/: Expo Router bundles every file under app/
    // as a route, so importing vitest there pulls vite into the Metro bundle
    // and breaks the native build.
    include: ["components/**/*.test.{ts,tsx}", "test/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // The Expo Router entrypoints (app/_layout.tsx, app/index.tsx) and the
      // boot-splash components are render-tested with @testing-library/react
      // over mocks for react-native, expo-router, expo-* and @aqui-suena/ui
      // (see test/setup.ts and the test/app/*.test.tsx + components/*.test.tsx
      // files). PlayerLanding and its behavior live in @aqui-suena/ui (covered
      // there), so it is mocked here to keep the surface small.
      include: ["components/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}"],
      // Baseline on 2026-11-26: 100% across the board. Thresholds sit ~2 points
      // below to leave a little headroom for future refactors.
      thresholds: {
        statements: 98,
        branches: 98,
        functions: 98,
        lines: 98,
      },
    },
  },
});
