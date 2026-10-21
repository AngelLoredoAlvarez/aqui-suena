import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const apiSrc = fileURLToPath(new URL("../../packages/api/src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@aqui-suena/api": apiSrc,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
