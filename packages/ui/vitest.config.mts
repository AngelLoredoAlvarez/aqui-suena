import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const configSrc = fileURLToPath(new URL("../config/src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@aqui-suena/config": configSrc,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
