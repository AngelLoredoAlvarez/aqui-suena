import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const mobileRoot = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@aqui-suena/mobile": mobileRoot },
  },
  test: {
    environment: "node",
    include: ["components/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // The mobile app is a thin shell. app/_layout.tsx and app/index.tsx are
      // Expo Router entrypoints; the boot-splash components (bit, footer-mark,
      // native-boot-splash) are presentational SVG/animation views at 0%. The
      // tested logic lives in components/ (splash-bars, splash-layout,
      // splash-progress, use-boot-splash-animation), while PlayerLanding and its
      // behavior live in @aqui-suena/ui (covered there). Unlike web, these .tsx
      // files parse cleanly, so the report is fully honest and includes the
      // untested entrypoints at 0%.
      include: ["components/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}"],
      // Baseline on 2026-11-26: statements 42.55, branches 47.61,
      // functions 41.46, lines 42.64. Thresholds sit ~2 points below.
      thresholds: {
        statements: 40,
        branches: 45,
        functions: 39,
        lines: 40,
      },
    },
  },
});
