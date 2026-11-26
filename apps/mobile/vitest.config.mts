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
      // The mobile app is a thin shell. app/_layout.tsx and app/index.tsx are
      // Expo Router entrypoints that render the app shell (they stay at 0%:
      // rendering them needs a full expo-router mock with little ROI). The
      // app-owned logic and the boot-splash components under components/ are
      // covered at ~98% via unit tests plus a @testing-library/react render
      // test over a react-native/react-native-svg mock (see test/setup.ts).
      // PlayerLanding and its behavior live in @aqui-suena/ui (covered there).
      include: ["components/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}"],
      // Baseline on 2026-11-26: statements 64.53, branches 57.14,
      // functions 60.97, lines 63.97. Thresholds sit ~2 points below.
      thresholds: {
        statements: 62,
        branches: 55,
        functions: 58,
        lines: 62,
      },
    },
  },
});
