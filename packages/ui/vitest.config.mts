import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const configSrc = fileURLToPath(new URL("../config/src", import.meta.url));
const apiSrc = fileURLToPath(new URL("../api/src", import.meta.url));
const apiClient = fileURLToPath(new URL("../api/src/client.ts", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@aqui-suena/api/client": apiClient,
      "@aqui-suena/api": apiSrc,
      "@aqui-suena/config": configSrc,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test-setup.ts"],
  },
});
