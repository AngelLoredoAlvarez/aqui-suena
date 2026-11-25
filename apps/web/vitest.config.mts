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
  },
});
