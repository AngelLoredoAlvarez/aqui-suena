import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const configSrc = fileURLToPath(new URL("../config/src", import.meta.url));
const apiSrc = fileURLToPath(new URL("../api/src", import.meta.url));
const apiClient = fileURLToPath(new URL("../api/src/client.ts", import.meta.url));
const playerSrc = fileURLToPath(new URL("../player/src", import.meta.url));
const uiSrc = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@aqui-suena/api/domain/ads/ads-carousel": fileURLToPath(
        new URL("../api/src/domain/ads/ads-carousel.ts", import.meta.url),
      ),
      "@aqui-suena/api/client": apiClient,
      "@aqui-suena/api": apiSrc,
      "@aqui-suena/config": configSrc,
      "@aqui-suena/player": playerSrc,
      "@aqui-suena/ui": uiSrc,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: [
        "src/test-setup.ts",
        "src/test-utils.tsx",
        "src/player-landing/utils/test-channels.ts",
        "**/*.test.{ts,tsx}",
      ],
      // Baseline on 2026-11-26: statements 88.24, branches 75.39,
      // functions 83.21, lines 88.86. Thresholds sit ~2 points below.
      thresholds: {
        statements: 86,
        branches: 73,
        functions: 81,
        lines: 86,
      },
    },
  },
});
